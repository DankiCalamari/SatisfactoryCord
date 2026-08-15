import fs from "node:fs";
import { parseLogLine } from "./log-parser.js";
export class LogWatcher {
    filePath;
    bus;
    logger;
    offset = 0;
    timer;
    inodeKey = "";
    constructor(filePath, bus, logger) {
        this.filePath = filePath;
        this.bus = bus;
        this.logger = logger;
    }
    start(intervalMs = 1000) {
        this.stop();
        this.timer = setInterval(() => this.poll(), intervalMs);
        this.timer.unref();
        this.poll();
    }
    stop() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = undefined;
    }
    available() {
        return fs.existsSync(this.filePath);
    }
    poll() {
        try {
            const stat = fs.statSync(this.filePath);
            const key = `${stat.dev}:${stat.ino}`;
            if (key !== this.inodeKey || stat.size < this.offset) {
                this.inodeKey = key;
                this.offset = Math.max(0, stat.size === 0 ? 0 : this.offset > stat.size ? 0 : this.offset);
            }
            if (stat.size <= this.offset)
                return;
            const stream = fs.createReadStream(this.filePath, { start: this.offset, end: stat.size - 1, encoding: "utf8" });
            let data = "";
            stream.on("data", (chunk) => {
                data += chunk;
            });
            stream.on("end", () => {
                this.offset = stat.size;
                for (const line of data.split(/\r?\n/)) {
                    for (const event of parseLogLine(line))
                        this.bus.publish(event);
                }
            });
        }
        catch (error) {
            this.logger.debug("FactoryGame.log is not available yet.", { error: error instanceof Error ? error.message : error });
        }
    }
}
