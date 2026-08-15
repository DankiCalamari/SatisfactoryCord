export class RestartManager {
  private readonly crashes: number[] = [];

  constructor(
    private readonly maxRestarts: number,
    private readonly windowSeconds: number,
    private readonly delaySeconds: number
  ) {}

  recordCrash(now = Date.now()): { allowed: boolean; delayMs: number; count: number } {
    const windowMs = this.windowSeconds * 1000;
    this.crashes.push(now);
    while (this.crashes.length && now - this.crashes[0]! > windowMs) this.crashes.shift();
    return {
      allowed: this.maxRestarts === 0 ? false : this.crashes.length <= this.maxRestarts,
      delayMs: this.delaySeconds * 1000,
      count: this.crashes.length
    };
  }
}
