import { describe, it, expect } from "vitest";
import { parseSemVer, satisfies, matchesPattern, contractRefVersion } from "../../src/contracts/semver.js";

describe("semver", () => {
  it("parses valid versions", () => {
    expect(parseSemVer("2.1.0")).toEqual({ major: 2, minor: 1, patch: 0, prerelease: undefined });
  });

  it("satisfies range", () => {
    expect(satisfies("2.1.0", ">=2.0.0 <3.0.0")).toBe(true);
    expect(satisfies("1.9.0", ">=2.0.0 <3.0.0")).toBe(false);
    expect(satisfies("3.0.0", ">=2.0.0 <3.0.0")).toBe(false);
  });

  it("matches x patterns", () => {
    const v = parseSemVer("1.5.2")!;
    expect(matchesPattern(v, "1.x")).toBe(true);
    expect(matchesPattern(v, "2.x")).toBe(false);
  });

  it("parses contract ref version", () => {
    expect(contractRefVersion("contracts/testing@1.0.0")).toBe("1.0.0");
  });
});
