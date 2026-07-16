import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PapiLab project-initiation dependency boundary", () => {
  it("does not import Synara, Electron, React, OpenCode, SQLite, or application modules", async () => {
    const sourceRoot = path.dirname(new URL(import.meta.url).pathname);
    const sourceFiles = (await readdir(sourceRoot)).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );
    const forbidden = [
      /from\s+["']@synara\//,
      /from\s+["'](?:electron|react|react-dom|bun:sqlite|better-sqlite3)["']/,
      /from\s+["'][^"']*opencode/i,
      /from\s+["'][^"']*apps\//,
    ];
    for (const file of sourceFiles) {
      const contents = await readFile(path.join(sourceRoot, file), "utf8");
      for (const pattern of forbidden) {
        expect(contents, `${file} violates ${String(pattern)}`).not.toMatch(pattern);
      }
    }
  });
});
