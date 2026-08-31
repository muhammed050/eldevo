export type RetryOptions = { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; signal?: AbortSignal };

export function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new Error("Operation cancelled"));
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Operation cancelled")); }, { once: true });
  });
}

export async function withRetry<T>(operation: (attempt: number, signal: AbortSignal) => Promise<T>, options: RetryOptions = {}) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const controller = new AbortController();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (controller.signal.aborted) throw new Error("Operation cancelled");
    try { return await operation(attempt, controller.signal); }
    catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      await sleep(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)), controller.signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Operation failed");
}

export async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error(parentSignal?.aborted ? "Operation cancelled" : "Operation timed out")), { once: true })),
    ]);
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

export async function mapConcurrent<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>, concurrency = 3) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, run));
  return results;
}
