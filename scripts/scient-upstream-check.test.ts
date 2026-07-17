import { assert, describe, it } from "@effect/vitest";

import {
  assertCurrentUpstream,
  githubRepositoryFromRemote,
  shouldFetchUpstream,
} from "./scient-upstream-check.ts";

describe("scient upstream source check", () => {
  it("accepts equivalent GitHub SSH and HTTPS remote forms", () => {
    assert.equal(
      githubRepositoryFromRemote("git@github.com:ScientFactory/scient-desktop.git"),
      "scientfactory/scient-desktop",
    );
    assert.equal(
      githubRepositoryFromRemote("https://github.com/ScientFactory/scient-desktop.git"),
      "scientfactory/scient-desktop",
    );
    assert.equal(
      githubRepositoryFromRemote("ssh://git@github.com/ScientFactory/scient-desktop"),
      "scientfactory/scient-desktop",
    );
  });

  it("rejects non-GitHub and malformed remotes", () => {
    assert.equal(githubRepositoryFromRemote("https://example.com/owner/repo.git"), null);
    assert.equal(githubRepositoryFromRemote("DISABLED"), null);
    assert.equal(githubRepositoryFromRemote(""), null);
  });

  it("fetches upstream by default and requires an explicit offline opt-out", () => {
    assert.equal(shouldFetchUpstream([]), true);
    assert.equal(shouldFetchUpstream(["--checks"]), true);
    assert.equal(shouldFetchUpstream(["--no-fetch"]), false);
  });

  it("rejects a behind fork unless diagnostic mode is explicit", () => {
    assert.doesNotThrow(() => assertCurrentUpstream("0", []));
    assert.throws(() => assertCurrentUpstream("2", []), /2 commit\(s\) behind upstream\/main/);
    assert.doesNotThrow(() => assertCurrentUpstream("2", ["--allow-behind"]));
  });
});
