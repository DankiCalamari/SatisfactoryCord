import { parseLogLine } from "./log-parser.js";
export class StdoutParser {
    buffer = "";
    push(chunk) {
        this.buffer += chunk.toString();
        const lines = this.buffer.split(/\r?\n/);
        this.buffer = lines.pop() ?? "";
        return lines.flatMap((line) => parseLogLine(line));
    }
    flush() {
        if (!this.buffer)
            return [];
        const line = this.buffer;
        this.buffer = "";
        return parseLogLine(line);
    }
}
