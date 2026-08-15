import fs from "node:fs";
import path from "node:path";
import { sanitiseLogText } from "./sanitise.js";

export type LogLevel = "debug" | "info" | "warning" | "error";

const weights: Record<LogLevel, number> = { debug: 10, info: 20, warning: 30, error: 40 };

export class Logger {
  private readonly file: string;
  constructor(private readonly level: LogLevel = "info", logDir = "logs") {
    fs.mkdirSync(logDir, { recursive: true });
    this.file = path.join(logDir, "satisfactorycord.log");
  }

  debug(message: string, meta?: unknown): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.write("info", message, meta);
  }

  warning(message: string, meta?: unknown): void {
    this.write("warning", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (weights[level] < weights[this.level]) return;
    const clean = sanitiseLogText(message);
    const suffix = meta === undefined ? "" : ` ${JSON.stringify(meta, redactor)}`;
    const line = `${new Date().toISOString()} ${level.toUpperCase()} ${clean}${suffix}`;
    fs.appendFileSync(this.file, `${line}\n`);
    const terminal = level === "error" ? console.error : level === "warning" ? console.warn : console.log;
    terminal(`[wrapper] ${clean}`);
  }
}

function redactor(key: string, value: unknown): unknown {
  if (/token|password|secret|authorization/i.test(key)) return "[redacted]";
  return value;
}
