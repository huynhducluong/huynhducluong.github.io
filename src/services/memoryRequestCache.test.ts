import { describe, expect, it, vi } from "vitest";
import { MemoryRequestCache } from "./memoryRequestCache";

describe("MemoryRequestCache", () => {
  it("deduplicates concurrent requests and reuses a fresh value", async () => {
    const cache = new MemoryRequestCache<number>(30_000);
    const loader = vi.fn(async () => 42);

    const [first, second] = await Promise.all([cache.get(loader), cache.get(loader)]);

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(await cache.get(loader)).toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reloads after invalidation", async () => {
    const cache = new MemoryRequestCache<number>(30_000);
    const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.get(loader)).toBe(1);
    cache.invalidate();
    expect(await cache.get(loader)).toBe(2);
  });

  it("allows a mutation to replace the cached value", async () => {
    const cache = new MemoryRequestCache<number>(30_000);
    const loader = vi.fn(async () => 1);

    await cache.get(loader);
    cache.set(7);

    expect(await cache.get(loader)).toBe(7);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not let an older in-flight request overwrite a mutation", async () => {
    const cache = new MemoryRequestCache<number>(30_000);
    let resolveRequest: ((value: number) => void) | undefined;
    const pending = cache.get(() => new Promise<number>((resolve) => { resolveRequest = resolve; }));

    cache.set(9);
    resolveRequest?.(1);
    await pending;

    expect(await cache.get(async () => 2)).toBe(9);
  });
});
