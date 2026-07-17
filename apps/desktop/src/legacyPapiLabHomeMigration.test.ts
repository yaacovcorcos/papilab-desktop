import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { seedScientHomeFromPapiLab } from "./legacyPapiLabHomeMigration";

const roots = new Set<string>();

function fixture(): string {
  const root = FS.mkdtempSync(Path.join(OS.tmpdir(), "scient-home-migration-"));
  roots.add(root);
  return root;
}

afterEach(() => {
  for (const root of roots) FS.rmSync(root, { recursive: true, force: true });
  roots.clear();
});

describe("seedScientHomeFromPapiLab", () => {
  it("atomically seeds Scient and leaves PapiLab intact", () => {
    const root = fixture();
    const sourcePath = Path.join(root, ".papilab");
    const targetPath = Path.join(root, ".scient");
    FS.mkdirSync(Path.join(sourcePath, "userdata"), { recursive: true });
    FS.mkdirSync(Path.join(sourcePath, "codex-home-overlay"), { recursive: true });
    FS.writeFileSync(Path.join(sourcePath, "userdata", "state.sqlite"), "state");
    FS.writeFileSync(Path.join(sourcePath, "codex-home-overlay", "config.toml"), "model = test");
    FS.writeFileSync(Path.join(sourcePath, "unowned-cache"), "do-not-copy");

    expect(seedScientHomeFromPapiLab({ sourcePath, targetPath })).toMatchObject({
      status: "seeded",
      copiedEntries: ["userdata", "codex-home-overlay"],
    });
    expect(FS.readFileSync(Path.join(targetPath, "userdata", "state.sqlite"), "utf8")).toBe(
      "state",
    );
    expect(FS.readFileSync(Path.join(sourcePath, "userdata", "state.sqlite"), "utf8")).toBe(
      "state",
    );
    expect(FS.existsSync(Path.join(targetPath, "papilab-home-import.json"))).toBe(true);
    expect(FS.existsSync(Path.join(targetPath, "unowned-cache"))).toBe(false);
  });

  it("never overwrites an existing Scient home", () => {
    const root = fixture();
    const sourcePath = Path.join(root, ".papilab");
    const targetPath = Path.join(root, ".scient");
    FS.mkdirSync(sourcePath);
    FS.mkdirSync(targetPath);
    FS.writeFileSync(Path.join(targetPath, "sentinel"), "current");

    expect(seedScientHomeFromPapiLab({ sourcePath, targetPath }).status).toBe("target-exists");
    expect(FS.readFileSync(Path.join(targetPath, "sentinel"), "utf8")).toBe("current");
  });

  it("rejects a source outside the target parent", () => {
    const first = fixture();
    const second = fixture();
    const sourcePath = Path.join(first, ".papilab");
    FS.mkdirSync(sourcePath);

    expect(
      seedScientHomeFromPapiLab({ sourcePath, targetPath: Path.join(second, ".scient") }).status,
    ).toBe("legacy-missing");
  });
});
