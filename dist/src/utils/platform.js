import os from "node:os";
export function isWindows() {
    return os.platform() === "win32";
}
export function splitArgs(value) {
    if (Array.isArray(value))
        return value;
    if (!value)
        return [];
    const args = [];
    let current = "";
    let quote = null;
    for (const char of value) {
        if ((char === "\"" || char === "'") && !quote) {
            quote = char;
            continue;
        }
        if (char === quote) {
            quote = null;
            continue;
        }
        if (/\s/.test(char) && !quote) {
            if (current)
                args.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    if (current)
        args.push(current);
    return args;
}
export function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [
        days ? `${days}d` : "",
        hours ? `${hours}h` : "",
        minutes ? `${minutes}m` : "",
        !days && !hours && !minutes ? `${Math.max(0, Math.floor(seconds))}s` : ""
    ].filter(Boolean);
    return parts.join(" ");
}
