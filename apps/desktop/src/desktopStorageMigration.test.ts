import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

import { describe, expect, it } from "vitest";

import {
  acknowledgeScientStorageSnapshot,
  readScientStorageSnapshot,
  saveScientStorageSnapshot,
  SCIENT_STORAGE_SNAPSHOT_MAX_BYTES,
  validateScientStorageSnapshot,
} from "./desktopStorageMigration";

const snapshot = (exportedAt = "2026-07-09T00:00:00.000Z") => ({
  version: 1 as const,
  exportedAt,
  entries: {
    "scient:theme": "dark",
    "scient.openUsage.enabled": "true",
  },
});

describe("desktopStorageMigration", () => {
  it("round-trips atomically and acknowledges the snapshot", async () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "synara-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      await expect(saveScientStorageSnapshot(target, snapshot())).resolves.toBe(true);
      expect(readScientStorageSnapshot(target)).toEqual(snapshot());
      expect(FS.readdirSync(directory)).toEqual(["snapshot.json"]);

      await acknowledgeScientStorageSnapshot(target);
      expect(readScientStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects malformed, disallowed, and oversized snapshots", () => {
    expect(validateScientStorageSnapshot({ version: 1 })).toBeNull();
    expect(
      validateScientStorageSnapshot({
        ...snapshot(),
        entries: { "foreign:theme": "dark" },
      }),
    ).toBeNull();
    expect(
      validateScientStorageSnapshot({
        ...snapshot(),
        entries: { "scient:large": "x".repeat(SCIENT_STORAGE_SNAPSHOT_MAX_BYTES) },
      }),
    ).toBeNull();
  });

  it("accepts renderer snapshots containing large composer drafts", () => {
    const largeDraft = "x".repeat(2 * 1024 * 1024);

    expect(
      validateScientStorageSnapshot({
        ...snapshot(),
        entries: { "scient:composer-drafts:v1": largeDraft },
      })?.entries["scient:composer-drafts:v1"],
    ).toBe(largeDraft);
  });

  it("accepts the narrow PapiLab key namespace used by the upgrade bridge", () => {
    expect(
      validateScientStorageSnapshot({
        ...snapshot(),
        entries: { "papilab:theme": "dark", "papilab.openUsage.enabled": "true" },
      })?.entries,
    ).toEqual({ "papilab:theme": "dark", "papilab.openUsage.enabled": "true" });
  });

  it("does not replace a newer snapshot with an older export", async () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "synara-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      await saveScientStorageSnapshot(target, snapshot("2026-07-09T01:00:00.000Z"));
      await expect(
        saveScientStorageSnapshot(target, snapshot("2026-07-09T00:00:00.000Z")),
      ).resolves.toBe(false);
      expect(readScientStorageSnapshot(target)?.exportedAt).toBe("2026-07-09T01:00:00.000Z");
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("treats missing and malformed files as absent", () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "synara-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      expect(readScientStorageSnapshot(target)).toBeNull();
      FS.writeFileSync(target, "not json");
      expect(readScientStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });
});
