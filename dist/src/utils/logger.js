import fs from "node:fs";
import path from "node:path";
import { sanitiseLogText } from "./sanitise.js";
const weights = { debug: 10, info: 20, warning: 30, error: 40 };
export class Logger {
    level;
    file;
    constructor(level = "info", logDir = "logs") {
        this.level = level;
        fs.mkdirSync(logDir, { recursive: true });
        this.file = path.join(logDir, "satisfactorycord.log");
    }
    debug(message, meta) {
        this.write("debug", message, meta);
    }
    info(message, meta) {
        this.write("info", message, meta);
    }
    warning(message, meta) {
        this.write("warning", message, meta);
    }
    error(message, meta) {
        this.write("error", message, meta);
    }
    write(level, message, meta) {
        if (weights[level] < weights[this.level])
            return;
        const clean = sanitiseLogText(message);
        const suffix = meta === undefined ? "" : ` ${JSON.stringify(meta, redactor)}`;
        const line = `${new Date().toISOString()} ${level.toUpperCase()} ${clean}${suffix}`;
        fs.appendFileSync(this.file, `${line}\n`);
        const terminal = level === "error" ? console.error : level === "warning" ? console.warn : console.log;
        terminal(`[wrapper] ${clean}`);
    }
}
function redactor(key, value) {
    if (/token|password|secret|authorization/i.test(key))
        return "[redacted]";
    return value;
}
