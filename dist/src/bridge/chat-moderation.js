import fs from "node:fs";
import path from "node:path";
import { sanitiseLogText } from "../utils/sanitise.js";
export class ChatModerator {
    config;
    blockedRegexes;
    blockedTermsFromFile = [];
    blockedWordsFileMtime = 0;
    constructor(config) {
        this.config = config;
        this.blockedRegexes = config.moderation.blockedPatterns.map((pattern) => new RegExp(pattern, "iu"));
        this.reloadBlockedWordsFile();
    }
    review(chat) {
        if (!this.config.moderation.enabled) {
            return { action: "allow", reasons: [], chat };
        }
        const message = sanitiseLogText(chat.message);
        const playerName = sanitiseLogText(chat.playerName);
        const reasons = [];
        if (message.length > this.config.moderation.maxMessageLength) {
            reasons.push("message_length");
        }
        if (this.config.moderation.maxRepeatedCharacters > 0 &&
            hasRepeatedCharacters(message, this.config.moderation.maxRepeatedCharacters)) {
            reasons.push("repeated_characters");
        }
        if (this.config.moderation.blockDiscordMentions && /@(everyone|here|[!&]?\d{16,22})/i.test(message)) {
            reasons.push("discord_mention");
        }
        this.reloadBlockedWordsFile();
        for (const term of this.blockedTerms()) {
            if (term && containsBlockedTerm(message, term))
                reasons.push(`blocked_term:${term}`);
        }
        for (const regex of this.blockedRegexes) {
            if (regex.test(message))
                reasons.push(`blocked_pattern:${regex.source}`);
        }
        return {
            action: reasons.length ? "block" : "allow",
            reasons,
            chat: { ...chat, playerName, message }
        };
    }
    blockedTerms() {
        return [...this.config.moderation.blockedTerms, ...this.blockedTermsFromFile];
    }
    reloadBlockedWordsFile() {
        const filePath = path.resolve(this.config.moderation.blockedWordsFile);
        try {
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs === this.blockedWordsFileMtime)
                return;
            this.blockedWordsFileMtime = stat.mtimeMs;
            this.blockedTermsFromFile = fs
                .readFileSync(filePath, "utf8")
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith("#"));
        }
        catch {
            this.blockedTermsFromFile = [];
            this.blockedWordsFileMtime = 0;
        }
    }
}
function containsBlockedTerm(message, term) {
    const escaped = escapeRegExp(term.trim());
    if (!escaped)
        return false;
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escaped}($|[^A-Za-z0-9_])`, "iu");
    return pattern.test(message);
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hasRepeatedCharacters(message, threshold) {
    let last = "";
    let count = 0;
    for (const char of message) {
        if (char === last) {
            count += 1;
            if (count >= threshold)
                return true;
        }
        else {
            last = char;
            count = 1;
        }
    }
    return false;
}
