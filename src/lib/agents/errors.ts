export type RuntimeErrorCode =
  | "TASK_CANCELLED"
  | "TASK_CLAIM_FAILED"
  | "TASK_PERSISTENCE_FAILED"
  | "STEP_CLAIM_FAILED"
  | "STEP_PERSISTENCE_FAILED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_PERSISTENCE_FAILED"
  | "TOOL_NOT_FOUND"
  | "TOOL_DENIED"
  | "MODEL_FAILURE"
  | "TIMEOUT"
  | "RETRY_EXHAUSTED"
  | "QUEUE_FAILURE"
  | "UNKNOWN_RUNTIME_ERROR";

export class RuntimeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(code: RuntimeErrorCode, message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super(message);
    this.name = "RuntimeError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.cause = options?.cause;
  }
}

export function classifyRuntimeError(error: unknown): RuntimeError {
  if (error instanceof RuntimeError) return error;
  const message = error instanceof Error ? error.message : "Task execution failed";
  const lower = message.toLowerCase();

  if (lower.includes("cancel")) return new RuntimeError("TASK_CANCELLED", message);
  if (lower.includes("timeout") || lower.includes("timed out")) return new RuntimeError("TIMEOUT", message, { retryable: true, cause: error });
  if (lower.includes("retry")) return new RuntimeError("RETRY_EXHAUSTED", message, { retryable: true, cause: error });
  if (lower.includes("unknown tool")) return new RuntimeError("TOOL_NOT_FOUND", message, { cause: error });
  if (lower.includes("denied") || lower.includes("not allowed")) return new RuntimeError("TOOL_DENIED", message, { cause: error });
  if (lower.includes("approval")) return new RuntimeError("APPROVAL_PERSISTENCE_FAILED", message, { cause: error });
  if (lower.includes("claim")) return new RuntimeError("STEP_CLAIM_FAILED", message, { retryable: true, cause: error });
  if (lower.includes("model")) return new RuntimeError("MODEL_FAILURE", message, { retryable: true, cause: error });
  if (lower.includes("persist") || lower.includes("create task") || lower.includes("task steps")) return new RuntimeError("TASK_PERSISTENCE_FAILED", message, { cause: error });
  return new RuntimeError("UNKNOWN_RUNTIME_ERROR", message, { cause: error });
}
