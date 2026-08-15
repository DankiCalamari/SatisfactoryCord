import { sanitiseLogText } from "../utils/sanitise.js";
const chatPatterns = [
    /^\[(?<time>[^\]]+)]\s*\[Chat]\s*(?<player>[^:]{1,64}):\s*(?<message>.+)$/i,
    /^\[Chat]\s*(?<player>[^:]{1,64}):\s*(?<message>.+)$/i,
    /LogChat[^:]*:\s*(?<player>[^:]{1,64}):\s*(?<message>.+)$/i,
    /Chat(?:Message)?:\s*(?<player>[^:]{1,64}):\s*(?<message>.+)$/i
];
const joinPatterns = [
    /(?<player>[A-Za-z0-9_. \-[\]]{1,64})\s+(?:joined|connected)/i,
    /Join succeeded.*?(?<player>[A-Za-z0-9_. \-[\]]{1,64})/i
];
const leavePatterns = [
    /(?<player>[A-Za-z0-9_. \-[\]]{1,64})\s+(?:left|disconnected)/i,
    /Logout.*?(?<player>[A-Za-z0-9_. \-[\]]{1,64})/i
];
export function parseLogLine(rawLine, now = new Date()) {
    const line = sanitiseLogText(rawLine);
    if (!line)
        return [];
    const events = [consoleEvent(line, now)];
    const chat = parseChat(line, now);
    if (chat)
        events.push(chat);
    const joined = firstMatch(line, joinPatterns);
    if (joined)
        events.push({ type: "player-joined", timestamp: now, playerName: joined });
    const left = firstMatch(line, leavePatterns);
    if (left)
        events.push({ type: "player-left", timestamp: now, playerName: left });
    if (/save.*(?:complete|finished|success)/i.test(line)) {
        events.push({ type: "save-completed", timestamp: now });
    }
    if (/server.*(?:ready|is now running|listening)/i.test(line)) {
        events.push({ type: "server-ready", timestamp: now });
    }
    return events;
}
function parseChat(line, timestamp) {
    for (const pattern of chatPatterns) {
        const match = line.match(pattern);
        if (!match?.groups)
            continue;
        const playerName = sanitiseLogText(match.groups.player ?? "").slice(0, 64);
        const message = sanitiseLogText(match.groups.message ?? "").slice(0, 500);
        if (!playerName || !message)
            continue;
        return { type: "game-chat", chat: { timestamp, playerName, message } };
    }
    return undefined;
}
function firstMatch(line, patterns) {
    for (const pattern of patterns) {
        const match = line.match(pattern);
        const value = sanitiseLogText(match?.groups?.player ?? "");
        if (value)
            return value.slice(0, 64);
    }
    return undefined;
}
function consoleEvent(line, timestamp) {
    const level = /error|fatal|crash/i.test(line) ? "error" : /warn/i.test(line) ? "warning" : "info";
    return { type: "console", timestamp, level, line };
}
