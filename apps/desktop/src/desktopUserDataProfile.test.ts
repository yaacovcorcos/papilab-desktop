import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  repairBrowserProfileFromBridgeManifest,
  resolveDesktopAppDataBase,
  resolveDesktopUserDataPath,
  resolvePapiLabDesktopUserDataPath,
  seedDesktopUserDataProfileFromPapiLab,
} from "./desktopUserDataProfile";

const tempDirs = new Set<string>();

function makeTempDir(): string {
  const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "synara-profile-test-"));
  tempDirs.add(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirs) {
    FS.rmSync(directory, { recursive: true, force: true });
  }
  tempDirs.clear();
});

describe("desktopUserDataProfile", () => {
  it("resolves the canonical Scient profile names", () => {
    const appDataBase = "/Users/tester/Library/Application Support";
    expect(resolveDesktopUserDataPath({ appDataBase, isDevelopment: true })).toBe(
      "/Users/tester/Library/Application Support/scient-dev",
    );
    expect(resolveDesktopUserDataPath({ appDataBase, isDevelopment: false })).toBe(
      "/Users/tester/Library/Application Support/scient",
    );
  });

  it("resolves the exact sibling PapiLab profile used for upgrade migration", () => {
    const appDataBase = "/Users/tester/Library/Application Support";
    expect(resolvePapiLabDesktopUserDataPath({ appDataBase, isDevelopment: false })).toBe(
      "/Users/tester/Library/Application Support/papilab",
    );
    expect(resolvePapiLabDesktopUserDataPath({ appDataBase, isDevelopment: true })).toBe(
      "/Users/tester/Library/Application Support/papilab-dev",
    );
  });

  it("atomically seeds known browser state from PapiLab without deleting the source", () => {
    const appDataBase = makeTempDir();
    const sourcePath = Path.join(appDataBase, "papilab");
    const targetPath = Path.join(appDataBase, "scient");
    FS.mkdirSync(Path.join(sourcePath, "Local Storage"), { recursive: true });
    FS.mkdirSync(Path.join(sourcePath, "Partitions", "papilab-browser"), { recursive: true });
    FS.writeFileSync(Path.join(sourcePath, "Cookies"), "cookie");
    FS.writeFileSync(Path.join(sourcePath, "Local Storage", "state"), "state");
    FS.writeFileSync(
      Path.join(sourcePath, "Partitions", "papilab-browser", "Cookies"),
      "browser-cookie",
    );

    expect(seedDesktopUserDataProfileFromPapiLab({ sourcePath, targetPath })).toMatchObject({
      status: "seeded",
      sourcePath,
      targetPath,
      copiedEntries: ["Cookies", "Local Storage"],
    });
    expect(repairBrowserProfileFromBridgeManifest(targetPath).status).toBe("repaired");
    expect(FS.readFileSync(Path.join(targetPath, "Cookies"), "utf8")).toBe("cookie");
    expect(FS.readFileSync(Path.join(sourcePath, "Cookies"), "utf8")).toBe("cookie");
    expect(FS.existsSync(Path.join(targetPath, "Partitions", "scient-browser"))).toBe(true);
    expect(
      FS.readFileSync(Path.join(targetPath, "Partitions", "scient-browser", "Cookies"), "utf8"),
    ).toBe("browser-cookie");
    expect(FS.existsSync(Path.join(targetPath, "Partitions", "papilab-browser"))).toBe(false);
    expect(FS.existsSync(Path.join(targetPath, "papilab-profile-seed.json"))).toBe(true);
  });

  it("never overwrites an existing Scient profile", () => {
    const appDataBase = makeTempDir();
    const sourcePath = Path.join(appDataBase, "papilab");
    const targetPath = Path.join(appDataBase, "scient");
    FS.mkdirSync(sourcePath);
    FS.mkdirSync(targetPath);
    FS.writeFileSync(Path.join(targetPath, "Preferences"), "current");

    expect(seedDesktopUserDataProfileFromPapiLab({ sourcePath, targetPath }).status).toBe(
      "target-exists",
    );
    expect(FS.readFileSync(Path.join(targetPath, "Preferences"), "utf8")).toBe("current");
  });

  it("uses XDG_CONFIG_HOME on Linux when available", () => {
    expect(
      resolveDesktopAppDataBase({
        platform: "linux",
        env: { XDG_CONFIG_HOME: "/tmp/xdg" },
        homeDir: "/home/tester",
      }),
    ).toBe("/tmp/xdg");
  });

  it("repairs missing browser data from the profile recorded by the bridge", () => {
    const appDataBase = makeTempDir();
    const targetPath = Path.join(appDataBase, "scient");
    const sourcePath = Path.join(appDataBase, "previous-profile");
    const sourcePartitionPath = Path.join(sourcePath, "Partitions", "previous-browser");
    const targetPartitionPath = Path.join(targetPath, "Partitions", "scient-browser");
    FS.mkdirSync(Path.join(sourcePartitionPath, "Local Storage"), { recursive: true });
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies"), "bridge-cookie");
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies-journal"), "bridge-journal");
    FS.writeFileSync(Path.join(sourcePartitionPath, "Local Storage", "state"), "bridge-state");
    FS.mkdirSync(Path.join(targetPartitionPath, "Local Storage"), { recursive: true });
    FS.writeFileSync(Path.join(targetPartitionPath, "Local Storage", "state"), "current-state");
    FS.writeFileSync(
      Path.join(targetPath, "synara-profile-seed.json"),
      JSON.stringify({ sourcePath }),
    );

    const result = repairBrowserProfileFromBridgeManifest(targetPath);

    expect(result).toMatchObject({
      status: "repaired",
      sourcePath,
      targetPath,
      copiedEntries: ["Cookies", "Cookies-journal"],
    });
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies"), "utf8")).toBe(
      "bridge-cookie",
    );
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies-journal"), "utf8")).toBe(
      "bridge-journal",
    );
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Local Storage", "state"), "utf8")).toBe(
      "current-state",
    );
  });

  it("rejects bridge manifests that point outside the Synara profile parent", () => {
    const appDataBase = makeTempDir();
    const unrelatedBase = makeTempDir();
    const targetPath = Path.join(appDataBase, "scient");
    FS.mkdirSync(targetPath, { recursive: true });
    FS.writeFileSync(
      Path.join(targetPath, "synara-profile-seed.json"),
      JSON.stringify({ sourcePath: Path.join(unrelatedBase, "previous-profile") }),
    );

    expect(repairBrowserProfileFromBridgeManifest(targetPath)).toMatchObject({
      status: "bridge-unavailable",
      sourcePath: null,
      copiedEntries: [],
    });
  });

  it("never adds a foreign SQLite sidecar beside an existing Scient database", () => {
    const appDataBase = makeTempDir();
    const targetPath = Path.join(appDataBase, "scient");
    const sourcePath = Path.join(appDataBase, "previous-profile");
    const sourcePartitionPath = Path.join(sourcePath, "Partitions", "previous-browser");
    const targetPartitionPath = Path.join(targetPath, "Partitions", "scient-browser");
    FS.mkdirSync(sourcePartitionPath, { recursive: true });
    FS.mkdirSync(targetPartitionPath, { recursive: true });
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies"), "bridge-cookie");
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies-journal"), "bridge-journal");
    FS.writeFileSync(Path.join(targetPartitionPath, "Cookies"), "current-cookie");
    FS.writeFileSync(
      Path.join(targetPath, "synara-profile-seed.json"),
      JSON.stringify({ sourcePath }),
    );

    expect(repairBrowserProfileFromBridgeManifest(targetPath)).toMatchObject({
      status: "not-needed",
      copiedEntries: [],
    });
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies"), "utf8")).toBe(
      "current-cookie",
    );
    expect(FS.existsSync(Path.join(targetPartitionPath, "Cookies-journal"))).toBe(false);
  });

  it("replaces an orphaned target sidecar with one from the repaired database generation", () => {
    const appDataBase = makeTempDir();
    const targetPath = Path.join(appDataBase, "scient");
    const sourcePath = Path.join(appDataBase, "previous-profile");
    const sourcePartitionPath = Path.join(sourcePath, "Partitions", "previous-browser");
    const targetPartitionPath = Path.join(targetPath, "Partitions", "scient-browser");
    FS.mkdirSync(sourcePartitionPath, { recursive: true });
    FS.mkdirSync(targetPartitionPath, { recursive: true });
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies"), "bridge-cookie");
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies-journal"), "bridge-journal");
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies-wal"), "bridge-wal");
    FS.writeFileSync(Path.join(sourcePartitionPath, "Cookies-shm"), "bridge-shm");
    FS.writeFileSync(Path.join(targetPartitionPath, "Cookies-journal"), "orphaned-journal");
    FS.writeFileSync(Path.join(targetPartitionPath, "Cookies-wal"), "orphaned-wal");
    FS.writeFileSync(Path.join(targetPartitionPath, "Cookies-shm"), "orphaned-shm");
    FS.writeFileSync(
      Path.join(targetPath, "synara-profile-seed.json"),
      JSON.stringify({ sourcePath }),
    );

    expect(repairBrowserProfileFromBridgeManifest(targetPath)).toMatchObject({
      status: "repaired",
      copiedEntries: ["Cookies", "Cookies-journal", "Cookies-wal", "Cookies-shm"],
    });
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies"), "utf8")).toBe(
      "bridge-cookie",
    );
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies-journal"), "utf8")).toBe(
      "bridge-journal",
    );
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies-wal"), "utf8")).toBe(
      "bridge-wal",
    );
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies-shm"), "utf8")).toBe(
      "bridge-shm",
    );
    expect(
      FS.readdirSync(targetPartitionPath).some((entryName) =>
        entryName.startsWith(".synara-bridge-"),
      ),
    ).toBe(false);
  });

  it("copies from only the newest browser partition recorded under the bridge profile", () => {
    const appDataBase = makeTempDir();
    const targetPath = Path.join(appDataBase, "scient");
    const sourcePath = Path.join(appDataBase, "previous-profile");
    const olderPartitionPath = Path.join(sourcePath, "Partitions", "older-browser");
    const newerPartitionPath = Path.join(sourcePath, "Partitions", "newer-browser");
    FS.mkdirSync(Path.join(olderPartitionPath, "Local Storage"), { recursive: true });
    FS.mkdirSync(newerPartitionPath, { recursive: true });
    FS.writeFileSync(Path.join(olderPartitionPath, "Cookies"), "older-cookie");
    FS.writeFileSync(Path.join(olderPartitionPath, "Local Storage", "state"), "older-state");
    FS.writeFileSync(Path.join(newerPartitionPath, "Cookies"), "newer-cookie");
    FS.utimesSync(olderPartitionPath, new Date(1_000), new Date(1_000));
    FS.utimesSync(newerPartitionPath, new Date(2_000), new Date(2_000));
    FS.mkdirSync(targetPath, { recursive: true });
    FS.writeFileSync(
      Path.join(targetPath, "synara-profile-seed.json"),
      JSON.stringify({ sourcePath }),
    );

    const result = repairBrowserProfileFromBridgeManifest(targetPath);
    const targetPartitionPath = Path.join(targetPath, "Partitions", "scient-browser");

    expect(result).toMatchObject({ status: "repaired", copiedEntries: ["Cookies"] });
    expect(FS.readFileSync(Path.join(targetPartitionPath, "Cookies"), "utf8")).toBe("newer-cookie");
    expect(FS.existsSync(Path.join(targetPartitionPath, "Local Storage"))).toBe(false);
  });

  it("ignores a malformed bridge manifest without attempting a repair", () => {
    const appDataBase = makeTempDir();
    const targetPath = Path.join(appDataBase, "scient");
    FS.mkdirSync(targetPath, { recursive: true });
    FS.writeFileSync(Path.join(targetPath, "synara-profile-seed.json"), "{");

    expect(repairBrowserProfileFromBridgeManifest(targetPath)).toMatchObject({
      status: "bridge-unavailable",
      sourcePath: null,
      copiedEntries: [],
    });
  });
});
