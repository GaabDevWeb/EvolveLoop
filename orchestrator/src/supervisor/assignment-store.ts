/**
 * Assignment claim/lease store — filesystem, at-least-once (mirrors JobStore semantics).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  renameSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AgentAssignment, SupervisorState } from "./types.js";
import { assertTransition } from "./lifecycle.js";

const DEFAULT_LEASE_MS = 60_000;

export interface ClaimAssignmentOptions {
  supervisorId: string;
  leaseMs?: number;
  now?: () => number;
}

export interface ClaimAssignmentResult {
  ok: boolean;
  assignment?: AgentAssignment;
  reason?: "not_found" | "not_claimable" | "race_lost" | "terminal" | "active_lease";
}

function assignmentPath(dir: string, id: string): string {
  return join(dir, `${id}.json`);
}

function lockPath(dir: string, id: string): string {
  return join(dir, `${id}.lock`);
}

function statePath(dir: string): string {
  return join(dir, "supervisor-state.json");
}

function isLeaseExpired(a: AgentAssignment, nowMs: number): boolean {
  if (!a.lease_until) return true;
  return Date.parse(a.lease_until) <= nowMs;
}

function isTerminal(status: AgentAssignment["status"]): boolean {
  return status === "SUCCEEDED" || status === "CANCELLED";
}

export class AssignmentStore {
  constructor(private readonly rootDir: string) {
    mkdirSync(rootDir, { recursive: true });
  }

  saveAssignment(a: AgentAssignment): void {
    writeFileSync(assignmentPath(this.rootDir, a.assignment_id), JSON.stringify(a, null, 2), "utf-8");
  }

  loadAssignment(id: string): AgentAssignment | null {
    const p = assignmentPath(this.rootDir, id);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as AgentAssignment;
  }

  listAssignments(): AgentAssignment[] {
    if (!existsSync(this.rootDir)) return [];
    return readdirSync(this.rootDir)
      .filter((f) => f.endsWith(".json") && f !== "supervisor-state.json")
      .map((f) => this.loadAssignment(f.replace(/\.json$/, "")))
      .filter((a): a is AgentAssignment => a != null);
  }

  saveState(state: SupervisorState): void {
    const tmp = statePath(this.rootDir) + ".tmp";
    writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    renameSync(tmp, statePath(this.rootDir));
  }

  loadState(): SupervisorState | null {
    const p = statePath(this.rootDir);
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as SupervisorState;
    } catch {
      return null;
    }
  }

  /**
   * Atomic-ish claim via exclusive lock file + lease.
   * Duplicate claim of active lease → rejected.
   */
  claimAssignment(assignmentId: string, options: ClaimAssignmentOptions): ClaimAssignmentResult {
    const nowMs = (options.now ?? Date.now)();
    const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
    const a = this.loadAssignment(assignmentId);
    if (!a) return { ok: false, reason: "not_found" };
    if (isTerminal(a.status)) return { ok: false, reason: "terminal" };

    const claimable =
      a.status === "PENDING" ||
      a.status === "RECOVERING" ||
      (a.status === "CLAIMED" && isLeaseExpired(a, nowMs)) ||
      ((a.status === "RUNNING" || a.status === "WAITING_RUNTIME") && isLeaseExpired(a, nowMs));

    if (!claimable) {
      if (a.lease_until && !isLeaseExpired(a, nowMs) && a.supervisor_id !== options.supervisorId) {
        return { ok: false, reason: "active_lease" };
      }
      return { ok: false, reason: "not_claimable" };
    }

    const lp = lockPath(this.rootDir, assignmentId);
    try {
      if (existsSync(lp)) {
        try {
          const prev = JSON.parse(readFileSync(lp, "utf-8")) as {
            supervisor_id: string;
            lease_until: string;
          };
          if (Date.parse(prev.lease_until) > nowMs && prev.supervisor_id !== options.supervisorId) {
            return { ok: false, reason: "race_lost" };
          }
        } catch {
          /* stale lock */
        }
      }
      const fd = openSync(lp, "wx");
      closeSync(fd);
    } catch {
      // lock exists — try steal if expired
      try {
        const prev = JSON.parse(readFileSync(lp, "utf-8")) as {
          supervisor_id: string;
          lease_until: string;
        };
        if (Date.parse(prev.lease_until) > nowMs && prev.supervisor_id !== options.supervisorId) {
          return { ok: false, reason: "race_lost" };
        }
        unlinkSync(lp);
        const fd = openSync(lp, "wx");
        closeSync(fd);
      } catch {
        return { ok: false, reason: "race_lost" };
      }
    }

    const leaseUntil = new Date(nowMs + leaseMs).toISOString();
    writeFileSync(
      lp,
      JSON.stringify({
        supervisor_id: options.supervisorId,
        lease_until: leaseUntil,
        assignment_id: assignmentId,
      }),
      "utf-8",
    );

    if (a.status === "PENDING") {
      assertTransition("PENDING", "CLAIMED");
    } else if (a.status === "RECOVERING") {
      assertTransition("RECOVERING", "CLAIMED");
    } else if (a.status === "RUNNING" || a.status === "WAITING_RUNTIME" || a.status === "CLAIMED") {
      // Expired lease reclaim — go through RECOVERING semantics without separate write
      if (!isLeaseExpired(a, nowMs) && a.supervisor_id !== options.supervisorId) {
        return { ok: false, reason: "active_lease" };
      }
    }

    const updated: AgentAssignment = {
      ...a,
      status: "CLAIMED",
      supervisor_id: options.supervisorId,
      claimed_at: new Date(nowMs).toISOString(),
      lease_until: leaseUntil,
    };
    this.saveAssignment(updated);
    return { ok: true, assignment: updated };
  }

  transition(
    assignmentId: string,
    to: AgentAssignment["status"],
    patch: Partial<AgentAssignment> = {},
  ): AgentAssignment {
    const a = this.loadAssignment(assignmentId);
    if (!a) throw new Error(`assignment not found: ${assignmentId}`);
    assertTransition(a.status, to);
    const next = { ...a, ...patch, status: to };
    this.saveAssignment(next);
    return next;
  }

  createPending(partial: Omit<AgentAssignment, "kind" | "apiVersion" | "status" | "created_at"> & {
    status?: AgentAssignment["status"];
  }): AgentAssignment {
    const a: AgentAssignment = {
      kind: "AgentAssignment",
      apiVersion: "evolveloop.io/se/v1",
      status: "PENDING",
      created_at: new Date().toISOString(),
      ...partial,
    };
    this.saveAssignment(a);
    return a;
  }

  newAssignmentId(): string {
    return `asgn-${randomUUID()}`;
  }

  /** Clear claim lock so another supervisor can reclaim after recovery */
  releaseLock(assignmentId: string): void {
    const lp = lockPath(this.rootDir, assignmentId);
    if (existsSync(lp)) {
      try {
        unlinkSync(lp);
      } catch {
        /* ignore */
      }
    }
  }
}
