// FILE: desktopUserDataProfile.ts
// Purpose: Resolves Scient's isolated Electron userData paths and legacy bridge repair utilities.

import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

const DEV_USER_DATA_DIR_NAME = "scient-dev";
const PROD_USER_DATA_DIR_NAME = "scient";
const PAPILAB_PROFILE_DIR_NAME = "papilab";
const PAPILAB_DEV_PROFILE_DIR_NAME = "papilab-dev";
const BRIDGE_PROFILE_MANIFEST_FILE_NAMES = [
  "papilab-profile-seed.json",
  "synara-profile-seed.json",
] as const;
const CANONICAL_BROWSER_PARTITION_NAME = "scient-browser";
const BROWSER_PARTITION_SEED_ENTRY_GROUPS = [
  ["Cookies", "Cookies-journal", "Cookies-wal", "Cookies-shm"],
  ["Local Storage"],
  ["IndexedDB"],
  ["Session Storage"],
  ["WebStorage"],
  ["Service Worker"],
  ["Preferences"],
  ["Network Persistent State"],
  ["TransportSecurity"],
  ["Trust Tokens", "Trust Tokens-journal", "Trust Tokens-wal", "Trust Tokens-shm"],
  ["SharedStorage", "SharedStorage-journal", "SharedStorage-wal", "SharedStorage-shm"],
  ["shared_proto_db"],
] as const;
const BROWSER_PARTITION_SEED_ENTRY_NAMES = BROWSER_PARTITION_SEED_ENTRY_GROUPS.flat();
const PROFILE_SEED_ENTRY_NAMES = BROWSER_PARTITION_SEED_ENTRY_NAMES;

export interface DesktopUserDataProfileSeedResult {
  readonly status: "seeded" | "target-exists" | "legacy-missing" | "seed-failed";
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly copiedEntries: readonly string[];
  readonly error?: unknown;
}

export interface BrowserProfileBridgeRepairResult {
  readonly status: "repaired" | "not-needed" | "bridge-unavailable" | "repair-failed";
  readonly sourcePath: string | null;
  readonly targetPath: string;
  readonly copiedEntries: readonly string[];
  readonly error?: unknown;
}

export function resolveDesktopAppDataBase(input?: {
  readonly platform?: NodeJS.Platform;
  readonly env?: NodeJS.ProcessEnv;
  readonly homeDir?: string;
}): string {
  const platform = input?.platform ?? process.platform;
  const env = input?.env ?? process.env;
  const homeDir = input?.homeDir ?? OS.homedir();

  if (platform === "win32") {
    return env.APPDATA || Path.join(homeDir, "AppData", "Roaming");
  }
  if (platform === "darwin") {
    return Path.join(homeDir, "Library", "Application Support");
  }
  return env.XDG_CONFIG_HOME || Path.join(homeDir, ".config");
}

export function resolveDesktopUserDataPath(input: {
  readonly appDataBase: string;
  readonly isDevelopment: boolean;
}): string {
  return Path.join(
    input.appDataBase,
    input.isDevelopment ? DEV_USER_DATA_DIR_NAME : PROD_USER_DATA_DIR_NAME,
  );
}

export function resolvePapiLabDesktopUserDataPath(input: {
  readonly appDataBase: string;
  readonly isDevelopment: boolean;
}): string {
  return Path.join(
    input.appDataBase,
    input.isDevelopment ? PAPILAB_DEV_PROFILE_DIR_NAME : PAPILAB_PROFILE_DIR_NAME,
  );
}

/**
 * Seeds Scient's new Electron profile from the exact sibling PapiLab profile.
 *
 * The copy is staged and renamed atomically. Existing Scient data always wins,
 * and only known Chromium state surfaces are copied. The source remains intact
 * for rollback.
 */
export function seedDesktopUserDataProfileFromPapiLab(input: {
  readonly sourcePath: string;
  readonly targetPath: string;
}): DesktopUserDataProfileSeedResult {
  const sourcePath = Path.resolve(input.sourcePath);
  const targetPath = Path.resolve(input.targetPath);
  const copiedEntries: string[] = [];
  if (FS.existsSync(targetPath)) {
    return { status: "target-exists", sourcePath, targetPath, copiedEntries };
  }
  if (
    sourcePath === targetPath ||
    Path.dirname(sourcePath) !== Path.dirname(targetPath) ||
    !FS.existsSync(sourcePath) ||
    !FS.statSync(sourcePath).isDirectory()
  ) {
    return { status: "legacy-missing", sourcePath, targetPath, copiedEntries };
  }

  const parentPath = Path.dirname(targetPath);
  const stagedPath = FS.mkdtempSync(Path.join(parentPath, ".scient-profile-seed-"));
  try {
    for (const entryName of PROFILE_SEED_ENTRY_NAMES) {
      const sourceEntryPath = Path.join(sourcePath, entryName);
      if (!FS.existsSync(sourceEntryPath)) continue;
      FS.cpSync(sourceEntryPath, Path.join(stagedPath, entryName), {
        recursive: true,
        dereference: false,
        errorOnExist: true,
        force: false,
      });
      copiedEntries.push(entryName);
    }
    FS.writeFileSync(
      Path.join(stagedPath, "papilab-profile-seed.json"),
      `${JSON.stringify({ sourcePath, seededAt: new Date().toISOString(), entries: copiedEntries }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    FS.renameSync(stagedPath, targetPath);
    return { status: "seeded", sourcePath, targetPath, copiedEntries };
  } catch (error) {
    FS.rmSync(stagedPath, { recursive: true, force: true });
    return { status: "seed-failed", sourcePath, targetPath, copiedEntries, error };
  }
}

function readBridgeProfileSourcePath(targetPath: string): string | null {
  const manifestPath = BRIDGE_PROFILE_MANIFEST_FILE_NAMES.map((fileName) =>
    Path.join(targetPath, fileName),
  ).find((candidate) => FS.existsSync(candidate));
  if (!manifestPath) return null;

  let parsed: { readonly sourcePath?: unknown };
  try {
    parsed = JSON.parse(FS.readFileSync(manifestPath, "utf8")) as {
      readonly sourcePath?: unknown;
    };
  } catch {
    return null;
  }
  if (typeof parsed.sourcePath !== "string" || !Path.isAbsolute(parsed.sourcePath)) {
    return null;
  }

  const sourcePath = Path.resolve(parsed.sourcePath);
  const resolvedTargetPath = Path.resolve(targetPath);
  if (
    sourcePath === resolvedTargetPath ||
    Path.dirname(sourcePath) !== Path.dirname(resolvedTargetPath)
  ) {
    return null;
  }
  return sourcePath;
}

function findBridgeBrowserPartitionPaths(sourceProfilePath: string): string[] {
  const partitionsPath = Path.join(sourceProfilePath, "Partitions");
  if (!FS.existsSync(partitionsPath)) return [];

  return FS.readdirSync(partitionsPath, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.endsWith("-browser") &&
        entry.name !== CANONICAL_BROWSER_PARTITION_NAME,
    )
    .map((entry) => Path.join(partitionsPath, entry.name))
    .filter((partitionPath) =>
      BROWSER_PARTITION_SEED_ENTRY_NAMES.some((entryName) =>
        FS.existsSync(Path.join(partitionPath, entryName)),
      ),
    )
    .sort((left, right) => FS.statSync(right).mtimeMs - FS.statSync(left).mtimeMs);
}

/**
 * Finishes any browser-partition copy described by the compatibility bridge.
 *
 * The bridge manifest identifies the exact sibling profile that supplied the Synara profile.
 * Discovering its `*-browser` partition from that trusted path avoids shipping predecessor names
 * while still repairing cookies or storage entries that were absent during the first bridge run.
 */
export function repairBrowserProfileFromBridgeManifest(
  targetPath: string,
): BrowserProfileBridgeRepairResult {
  let sourcePath: string | null = null;
  const copiedEntries: string[] = [];
  try {
    sourcePath = readBridgeProfileSourcePath(targetPath);
    if (!sourcePath || !FS.existsSync(sourcePath)) {
      return {
        status: "bridge-unavailable",
        sourcePath,
        targetPath,
        copiedEntries: [],
      };
    }

    const sourcePartitionPath = findBridgeBrowserPartitionPaths(sourcePath)[0];
    if (!sourcePartitionPath) {
      return {
        status: "not-needed",
        sourcePath,
        targetPath,
        copiedEntries: [],
      };
    }

    const targetPartitionPath = Path.join(
      targetPath,
      "Partitions",
      CANONICAL_BROWSER_PARTITION_NAME,
    );
    for (const entryGroup of BROWSER_PARTITION_SEED_ENTRY_GROUPS) {
      const baseEntryName = entryGroup[0];
      if (!FS.existsSync(Path.join(sourcePartitionPath, baseEntryName))) continue;
      if (FS.existsSync(Path.join(targetPartitionPath, baseEntryName))) continue;

      const sourceEntryNames = entryGroup.filter((entryName) =>
        FS.existsSync(Path.join(sourcePartitionPath, entryName)),
      );
      FS.mkdirSync(targetPartitionPath, { recursive: true });
      const stagedGroupPath = FS.mkdtempSync(Path.join(targetPartitionPath, ".synara-bridge-"));
      const stagedSourcePath = Path.join(stagedGroupPath, "source");
      const stagedTargetBackupPath = Path.join(stagedGroupPath, "target-backup");
      try {
        // Stage the whole source generation before removing orphaned target
        // sidecars, so a failed source copy leaves the target untouched.
        FS.mkdirSync(stagedSourcePath, { recursive: true });
        for (const entryName of sourceEntryNames) {
          FS.cpSync(
            Path.join(sourcePartitionPath, entryName),
            Path.join(stagedSourcePath, entryName),
            {
              recursive: true,
              errorOnExist: true,
              force: false,
            },
          );
        }

        // Another startup may have completed the repair while this group was
        // staged. Preserve its database and leave its sidecars untouched.
        if (FS.existsSync(Path.join(targetPartitionPath, baseEntryName))) continue;

        const installOrder = [
          ...sourceEntryNames.filter((entryName) => entryName !== baseEntryName),
          baseEntryName,
        ];
        const displacedTargetEntries: string[] = [];
        const installedSourceEntries: string[] = [];
        try {
          FS.mkdirSync(stagedTargetBackupPath, { recursive: true });
          for (const sidecarEntryName of entryGroup.slice(1)) {
            const targetEntryPath = Path.join(targetPartitionPath, sidecarEntryName);
            if (!FS.existsSync(targetEntryPath)) continue;
            FS.renameSync(targetEntryPath, Path.join(stagedTargetBackupPath, sidecarEntryName));
            displacedTargetEntries.push(sidecarEntryName);
          }
          for (const entryName of installOrder) {
            FS.renameSync(
              Path.join(stagedSourcePath, entryName),
              Path.join(targetPartitionPath, entryName),
            );
            installedSourceEntries.push(entryName);
          }
        } catch (installError) {
          const rollbackErrors: unknown[] = [];
          for (const entryName of installedSourceEntries.reverse()) {
            try {
              FS.rmSync(Path.join(targetPartitionPath, entryName), {
                recursive: true,
                force: true,
              });
            } catch (rollbackError) {
              rollbackErrors.push(rollbackError);
            }
          }
          for (const entryName of displacedTargetEntries) {
            try {
              FS.renameSync(
                Path.join(stagedTargetBackupPath, entryName),
                Path.join(targetPartitionPath, entryName),
              );
            } catch (rollbackError) {
              rollbackErrors.push(rollbackError);
            }
          }
          if (rollbackErrors.length > 0) {
            throw new AggregateError(
              [installError, ...rollbackErrors],
              "Browser profile bridge repair and rollback failed",
            );
          }
          throw installError;
        }
        copiedEntries.push(...sourceEntryNames);
      } finally {
        FS.rmSync(stagedGroupPath, { recursive: true, force: true });
      }
    }

    return {
      status: copiedEntries.length > 0 ? "repaired" : "not-needed",
      sourcePath,
      targetPath,
      copiedEntries,
    };
  } catch (error) {
    return {
      status: "repair-failed",
      sourcePath,
      targetPath,
      copiedEntries,
      error,
    };
  }
}
