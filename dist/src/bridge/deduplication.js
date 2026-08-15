export class Deduplicator {
    ttlMs;
    seen = new Map();
    constructor(ttlMs = 15_000) {
        this.ttlMs = ttlMs;
    }
    accept(event) {
        const now = Date.now();
        this.sweep(now);
        const key = fingerprint(event);
        if (this.seen.has(key))
            return false;
        this.seen.set(key, now + this.ttlMs);
        return true;
    }
    sweep(now) {
        for (const [key, expires] of this.seen) {
            if (expires <= now)
                this.seen.delete(key);
        }
    }
}
export function fingerprint(event) {
    if (event.type === "game-chat") {
        return `${event.type}:${event.chat.playerName}:${event.chat.message}`;
    }
    if ("playerName" in event)
        return `${event.type}:${event.playerName}`;
    if (event.type === "console")
        return `${event.type}:${event.level}:${event.line}`;
    return event.type;
}
