import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function makeTemporaryProject(): Promise<{
  readonly root: string;
  readonly cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "scient-project-init-"));
  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

export const TEST_IDENTITY = {
  projectId: "11111111-1111-4111-8111-111111111111",
  transactionId: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-07-16T12:00:00.000Z",
} as const;
