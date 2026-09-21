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
      context: { workspaceRoot: "/tmp/ws" },
    });
    expect(r.decision).toBe("confirm");
  });

  it("denies shell when workspaceRoot missing", () => {
    const r = authority.authorize({
      capability: "shell.execute",
      permissions: { shell: true },
      side_effects: true,
    });
    expect(r.decision).toBe("deny");
    expect(r.reason).toBe("workspace_root_required");
  });

  it("allows shell when allowShell=true", () => {
    const r = authority.authorize({
      capability: "shell.execute",
      permissions: { shell: true },
      context: { allowShell: true, workspaceRoot: "/tmp/ws" },
    });
    expect(r.decision).toBe("allow");
  });

  it("allows write when allowWrite=true", () => {
    const r = authority.authorize({
      capability: "filesystem.write",
      permissions: { filesystem: "write" },
      side_effects: true,
      context: { allowWrite: true, workspaceRoot: "/tmp/ws" },
    });
    expect(r.decision).toBe("allow");
  });

  it("denies write when workspaceRoot missing", () => {
    const r = authority.authorize({
      capability: "filesystem.write",
      permissions: { filesystem: "write" },
      context: { allowWrite: true },
    });
    expect(r.decision).toBe("deny");
    expect(r.reason).toBe("workspace_root_required");
  });

  it("denies path escape when workspaceRoot missing and targetPath set", () => {
    const r = authority.authorize({
      capability: "filesystem.read",
      targetPath: "/etc/passwd",
      context: { allowWrite: true },
    });
    expect(r.decision).toBe("deny");
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
