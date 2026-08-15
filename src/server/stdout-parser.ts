import { parseLogLine } from "./log-parser.js";
import type { ServerEvent } from "../bridge/event-bus.js";

export class StdoutParser {
  private buffer = "";

  push(chunk: Buffer | string): ServerEvent[] {
    this.buffer += chunk.toString();
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? "";
    return lines.flatMap((line) => parseLogLine(line));
  }

  flush(): ServerEvent[] {
    if (!this.buffer) return [];
    const line = this.buffer;
    this.buffer = "";
    return parseLogLine(line);
  }
}
