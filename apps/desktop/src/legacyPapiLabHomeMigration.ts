// FILE: legacyPapiLabHomeMigration.ts
// Purpose: Seeds Scient's runtime home from the previous PapiLab home without deleting rollback data.
// Layer: Desktop startup migration

import * as FS from "node:fs";
import * as Path from "node:path";

export interface LegacyPapiLabHomeMigrationResult {
  readonly status: "seeded" | "target-exists" | "legacy-missing" | "seed-failed";
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly copiedEntries: readonly string[];
  readonly error?: unknown;
}

const LEGACY_HOME_ENTRY_NAMES = ["userdata", "codex-home-overlay"] as const;

export function seedScientHomeFromPapiLab(input: {
  readonly sourcePath: string;
  readonly targetPath: string;
}): LegacyPapiLabHomeMigrationResult {
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

  const stagedPath = FS.mkdtempSync(Path.join(Path.dirname(targetPath), ".scient-home-seed-"));
  try {
    for (const entryName of LEGACY_HOME_ENTRY_NAMES) {
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
      Path.join(stagedPath, "papilab-home-import.json"),
      `${JSON.stringify({ sourcePath, importedAt: new Date().toISOString(), entries: copiedEntries }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    FS.renameSync(stagedPath, targetPath);
    return { status: "seeded", sourcePath, targetPath, copiedEntries };
  } catch (error) {
    FS.rmSync(stagedPath, { recursive: true, force: true });
    return { status: "seed-failed", sourcePath, targetPath, copiedEntries, error };
  }
}
