export class RestartManager {
    maxRestarts;
    windowSeconds;
    delaySeconds;
    crashes = [];
    constructor(maxRestarts, windowSeconds, delaySeconds) {
        this.maxRestarts = maxRestarts;
        this.windowSeconds = windowSeconds;
        this.delaySeconds = delaySeconds;
    }
    recordCrash(now = Date.now()) {
        const windowMs = this.windowSeconds * 1000;
        this.crashes.push(now);
        while (this.crashes.length && now - this.crashes[0] > windowMs)
            this.crashes.shift();
        return {
            allowed: this.maxRestarts === 0 ? false : this.crashes.length <= this.maxRestarts,
            delayMs: this.delaySeconds * 1000,
            count: this.crashes.length
        };
    }
}
