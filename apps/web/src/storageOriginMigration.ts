// FILE: storageOriginMigration.ts
// Purpose: Imports Synara browser state before renderer stores hydrate after a desktop origin move.

import type { ScientStorageSnapshot } from "@synara/contracts";

const MAX_SNAPSHOT_ENTRIES = 2_048;
const MAX_SNAPSHOT_KEY_LENGTH = 512;
const MAX_SNAPSHOT_VALUE_LENGTH = 16 * 1024 * 1024;
const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;

function toScientStorageKey(key: string): string | null {
  if (key.startsWith("scient:") || key.startsWith("scient.")) return key;
  if (key.startsWith("papilab:")) return `scient:${key.slice("papilab:".length)}`;
  if (key.startsWith("papilab.")) return `scient.${key.slice("papilab.".length)}`;
  return null;
}

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function importScientStorageSnapshot(
  snapshot: ScientStorageSnapshot | null,
  storage = getLocalStorage(),
): boolean {
  if (!snapshot || !storage || snapshot.version !== 1 || !snapshot.entries) return false;
  const entries = Object.entries(snapshot.entries);
  if (entries.length > MAX_SNAPSHOT_ENTRIES) return false;

  try {
    if (
      !Number.isFinite(Date.parse(snapshot.exportedAt)) ||
      new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > MAX_SNAPSHOT_BYTES
    ) {
      return false;
    }
    const mappedEntries = entries.map(([key, value]) => [toScientStorageKey(key), value] as const);
    for (const [key, value] of mappedEntries) {
      if (
        !key ||
        key.length > MAX_SNAPSHOT_KEY_LENGTH ||
        typeof value !== "string" ||
        value.length > MAX_SNAPSHOT_VALUE_LENGTH
      ) {
        return false;
      }
    }
    for (const [key, value] of mappedEntries) {
      if (!key) return false;
      if (storage.getItem(key) === null) storage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

export function bootstrapScientStorageOriginMigration(): void {
  const bridge = globalThis.window?.desktopBridge?.storageMigration;
  if (!bridge) return;

  try {
    const snapshot = bridge.readSnapshot();
    if (snapshot && importScientStorageSnapshot(snapshot)) {
      void bridge.acknowledgeSnapshot().catch(() => undefined);
    }
  } catch {
    // Keep the snapshot for a later retry if preload or storage is unavailable.
  }
}

bootstrapScientStorageOriginMigration();
