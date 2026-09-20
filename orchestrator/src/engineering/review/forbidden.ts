/**
 * Forbidden: Reviewer must never be used as Provider / Capability executor.
 */

export class ForbiddenReviewerExecutionError extends Error {
  constructor(action: string) {
    super(`Reviewer direct execution forbidden: ${action}`);
    this.name = "ForbiddenReviewerExecutionError";
  }
}

export const ForbiddenReviewerExecutor = {
  executeProvider(): never {
    throw new ForbiddenReviewerExecutionError("Provider");
  },
  executeCapability(): never {
    throw new ForbiddenReviewerExecutionError("Capability");
  },
  writeFilesystem(): never {
    throw new ForbiddenReviewerExecutionError("filesystem");
  },
  runShell(): never {
    throw new ForbiddenReviewerExecutionError("shell");
  },
};
