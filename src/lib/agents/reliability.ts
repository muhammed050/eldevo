export type RetryOptions = { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; signal?: AbortSignal };

export function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new Error("Operation cancelled"));
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => { clearTimeout(timer); reject(new Error("Operation cancelled")); };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withRetry<T>(operation: (attempt: number, signal: AbortSignal) => Promise<T>, options: RetryOptions = {}) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", onParentAbort, { once: true });
  }
  let lastError: unknown;
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (controller.signal.aborted) throw new Error("Operation cancelled");
      try { return await operation(attempt, controller.signal); }
      catch (error) {
        lastError = error;
        if (controller.signal.aborted || attempt === maxAttempts) break;
        await sleep(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)), controller.signal);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Operation failed");
  } finally {
    options.signal?.removeEventListener("abort", onParentAbort);
    controller.abort();
  }
}

export async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parentSignal?: AbortSignal) {
  const controller = new AbortController();
  let timeoutTriggered = false;
  let settled = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const onParentAbort = () => controller.abort();
  const onTimeout = () => { timeoutTriggered = true; controller.abort(); };
  const abortError = () => new Error(parentSignal?.aborted ? "Operation cancelled" : timeoutTriggered ? "Operation timed out" : "Operation cancelled");

  if (parentSignal?.aborted) throw new Error("Operation cancelled");
  parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  timeout = setTimeout(onTimeout, Math.max(1, timeoutMs));

  try {
    return await new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        if (!settled) {
          settled = true;
          reject(abortError());
        }
      };
      controller.signal.addEventListener("abort", onAbort, { once: true });
      operation(controller.signal).then(
        (value) => {
          if (!settled) {
            settled = true;
            resolve(value);
          }
        },
        (error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
        },
      );
    });
  } finally {
    if (timeout) clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", onParentAbort);
    if (!settled) settled = true;
    controller.abort();
  }
}

export async function mapConcurrent<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>, concurrency = 3) {
  if (items.length === 0) return [] as R[];
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
