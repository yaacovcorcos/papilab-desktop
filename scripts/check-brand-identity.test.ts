import { describe, expect, it } from "vitest";

import {
  findBrandIdentityViolations,
  findScientIdentityViolations,
  findScientSurfaceIdentityViolations,
  findVisualBrandAssetViolations,
} from "./check-brand-identity";

const characters = (...codes: number[]): string => String.fromCharCode(...codes);
const shortName = characters(116, 51);
const firstName = `${shortName}${characters(99, 111, 100, 101)}`;
const secondName = characters(100, 112, 99, 111, 100, 101);

describe("brand identity guard", () => {
  it("detects retired names in paths and text", () => {
    const violations = findBrandIdentityViolations([
      { path: `docs/${firstName}.md`, contents: "Synara" },
      { path: "source.ts", contents: `const value = "${secondName}:state";` },
    ]);
    expect(violations).toHaveLength(2);
  });

  it("rejects PapiLab outside the reviewed compatibility boundary", () => {
    expect(
      findBrandIdentityViolations([
        { path: "apps/web/src/components/Sidebar.tsx", contents: "Open PapiLab" },
      ]),
    ).toHaveLength(1);
  });

  it("allows PapiLab only in the reviewed migration boundary", () => {
    expect(
      findBrandIdentityViolations([
        {
          path: "apps/web/src/storageOriginMigration.ts",
          contents: 'if (key.startsWith("papilab:")) return key;',
        },
        {
          path: "apps/desktop/src/main.ts",
          contents: "const configuredLegacyPapiLabHome = process.env.PAPILAB_HOME;",
        },
      ]),
    ).toEqual([]);
  });

  it("does not match ordinary numeric type names or canonical Synara text", () => {
    expect(
      findBrandIdentityViolations([
        { path: "source.ts", contents: "const value = new Uint32Array(); // Synara" },
      ]),
    ).toEqual([]);
  });

  it("rejects retired identity in legal notices", () => {
    const notice = `Copyright (c) 2026 ${characters(84, 51)} ${characters(
      84,
      111,
      111,
      108,
      115,
    )} Inc.`;
    expect(findBrandIdentityViolations([{ path: "LICENSE", contents: notice }])).toHaveLength(1);
    expect(
      findBrandIdentityViolations([{ path: "docs/license-copy.md", contents: notice }]),
    ).toHaveLength(1);
  });

  it("requires user-facing raster assets to match a visually approved digest", () => {
    const approvedContents = new TextEncoder().encode("approved Synara screenshot");
    const approvedDigest = "a553296ca5a2d3ad7b64a6bc1b36c2834da750eae6611642177482b99ba85bd8";
    const approvedDigests = new Map([["screenshot.jpeg", approvedDigest]]);

    expect(
      findVisualBrandAssetViolations(
        [{ path: "screenshot.jpeg", contents: approvedContents }],
        approvedDigests,
      ),
    ).toEqual([]);
    expect(
      findVisualBrandAssetViolations(
        [{ path: "screenshot.jpeg", contents: new TextEncoder().encode("changed") }],
        approvedDigests,
      ),
    ).toHaveLength(1);
    expect(findVisualBrandAssetViolations([], approvedDigests)).toHaveLength(1);
  });

  it("requires Scient identity in distributable package metadata", () => {
    const requirements = new Map([
      ["package.json", ['name: "scient-desktop"', 'description: "Scient desktop build"']],
    ]);
    expect(
      findScientIdentityViolations(
        [{ path: "package.json", contents: 'name: "scient-desktop"' }],
        requirements,
      ),
    ).toHaveLength(1);
    expect(
      findScientIdentityViolations(
        [
          {
            path: "package.json",
            contents: 'name: "scient-desktop"\ndescription: "Scient desktop build"',
          },
        ],
        requirements,
      ),
    ).toEqual([]);
  });

  it("keeps upstream release marketing out of the Scient UI", () => {
    const requirements = new Map([["entries.ts", ["WHATS_NEW_ENTRIES = []"]]]);
    expect(
      findScientIdentityViolations(
        [{ path: "entries.ts", contents: "WHATS_NEW_ENTRIES = upstreamEntries" }],
        requirements,
      ),
    ).toHaveLength(1);
    expect(
      findScientIdentityViolations(
        [{ path: "entries.ts", contents: "WHATS_NEW_ENTRIES = []" }],
        requirements,
      ),
    ).toEqual([]);
  });

  it("rejects Synara copy from Scient-owned user and developer surfaces", () => {
    const surfacePaths = new Set(["Sidebar.tsx", "desktopUpdate.logic.ts", "dev-electron.mjs"]);
    expect(
      findScientSurfaceIdentityViolations(
        [
          { path: "desktopUpdate.logic.ts", contents: "Synara restarted." },
          { path: "dev-electron.mjs", contents: "SYNARA (Dev) is running." },
          { path: "Sidebar.tsx", contents: 'description: "synara is downloading."' },
        ],
        surfacePaths,
      ),
    ).toHaveLength(3);
    expect(
      findScientSurfaceIdentityViolations(
        [
          { path: "desktopUpdate.logic.ts", contents: "Scient restarted." },
          {
            path: "dev-electron.mjs",
            contents: "--synara-dev-root=/tmp/project\nimport '@synara/contracts';",
          },
          { path: "Sidebar.tsx", contents: "// Synara owns the inherited run tracker." },
        ],
        surfacePaths,
      ),
    ).toEqual([]);
  });
});
