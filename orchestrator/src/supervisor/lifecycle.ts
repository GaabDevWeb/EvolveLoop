import type { AssignmentStatus } from "./types.js";
import { ASSIGNMENT_TRANSITIONS } from "./types.js";

export class InvalidAssignmentTransitionError extends Error {
  constructor(
    public readonly from: AssignmentStatus,
    public readonly to: AssignmentStatus,
  ) {
    super(`Invalid assignment transition ${from} → ${to}`);
    this.name = "InvalidAssignmentTransitionError";
  }
}

export function canTransitionAssignment(from: AssignmentStatus, to: AssignmentStatus): boolean {
  if (from === to) return true;
  return (ASSIGNMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: AssignmentStatus, to: AssignmentStatus): void {
  if (!canTransitionAssignment(from, to)) {
    throw new InvalidAssignmentTransitionError(from, to);
  }
}
