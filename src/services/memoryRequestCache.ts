export class MemoryRequestCache<T> {
  private readonly ttlMs: number;
  private value: T | undefined;
  private expiresAt = 0;
  private pending: Promise<T> | null = null;
  private revision = 0;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  async get(loader: () => Promise<T>, force = false): Promise<T> {
    const now = Date.now();
    if (!force && this.value !== undefined && now < this.expiresAt) return this.value;
    if (!force && this.pending) return this.pending;
    if (force) this.revision += 1;

    const requestRevision = this.revision;
    const request = loader()
      .then((value) => {
        if (requestRevision === this.revision) {
          this.value = value;
          this.expiresAt = Date.now() + this.ttlMs;
        }
        return value;
      })
      .finally(() => {
        if (this.pending === request) this.pending = null;
      });
    this.pending = request;
    return request;
  }

  set(value: T): void {
    this.revision += 1;
    this.value = value;
    this.expiresAt = Date.now() + this.ttlMs;
    this.pending = null;
  }

  invalidate(): void {
    this.revision += 1;
    this.value = undefined;
    this.expiresAt = 0;
    this.pending = null;
  }
}
