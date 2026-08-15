import type { ServerEvent } from "./event-bus.js";

export class Deduplicator {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs = 15_000) {}

  accept(event: ServerEvent): boolean {
    const now = Date.now();
    this.sweep(now);
    const key = fingerprint(event);
    if (this.seen.has(key)) return false;
    this.seen.set(key, now + this.ttlMs);
    return true;
  }

  private sweep(now: number): void {
    for (const [key, expires] of this.seen) {
      if (expires <= now) this.seen.delete(key);
    }
  }
}

export function fingerprint(event: ServerEvent): string {
  if (event.type === "game-chat") {
    return `${event.type}:${event.chat.playerName}:${event.chat.message}`;
  }
  if ("playerName" in event) return `${event.type}:${event.playerName}`;
  if (event.type === "console") return `${event.type}:${event.level}:${event.line}`;
  return event.type;
}
