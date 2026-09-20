import { describe, it, expect } from "vitest";
import { CapabilityAuthority } from "../../src/authority/capability-authority.js";

describe("CapabilityAuthority", () => {
  const authority = new CapabilityAuthority();

  it("allows read-only filesystem", () => {
    const r = authority.authorize({
      capability: "filesystem.read",
      permissions: { filesystem: "read" },
      deterministic: true,
    });
    expect(r.decision).toBe("allow");
  });

  it("requires confirm for shell without flags", () => {
    const r = authority.authorize({
      capability: "shell.execute",
      permissions: { shell: true },
      side_effects: true,
      requires_confirmation: true,
    });
    expect(r.decision).toBe("confirm");
  });

  it("allows shell when allowShell=true", () => {
    const r = authority.authorize({
      capability: "shell.execute",
      permissions: { shell: true },
      context: { allowShell: true },
    });
    expect(r.decision).toBe("allow");
  });

  it("allows write when allowWrite=true", () => {
    const r = authority.authorize({
      capability: "filesystem.write",
      permissions: { filesystem: "write" },
      side_effects: true,
      context: { allowWrite: true },
    });
    expect(r.decision).toBe("allow");
  });

  it("denies path escape", () => {
    const r = authority.authorize({
      capability: "filesystem.read",
      targetPath: "../etc/passwd",
      context: { workspaceRoot: "/tmp/ws" },
    });
    expect(r.decision).toBe("deny");
  });

  it("allows git.inspect", () => {
    expect(authority.authorize({ capability: "git.inspect" }).decision).toBe("allow");
  });
});
