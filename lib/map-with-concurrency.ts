/**
 * 固定并发数的异步任务池；返回数组顺序与 items 下标一致。
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const cap = Math.max(
    1,
    Math.min(Math.floor(concurrency), items.length),
  );

  async function workerFn() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: cap }, () => workerFn()));
  return results;
}
