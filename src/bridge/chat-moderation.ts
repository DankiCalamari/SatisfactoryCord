import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { GameChatMessage } from "./event-bus.js";
import { sanitiseLogText } from "../utils/sanitise.js";

export type ModerationAction = "allow" | "block" | "flag";

export interface ModerationDecision {
  action: ModerationAction;
  reasons: string[];
  chat: GameChatMessage;
}

export class ChatModerator {
  private readonly blockedRegexes: RegExp[];
  private blockedTermsFromFile: string[] = [];
  private blockedWordsFileMtime = 0;

  constructor(private readonly config: AppConfig) {
    this.blockedRegexes = config.moderation.blockedPatterns.map((pattern) => new RegExp(pattern, "iu"));
    this.reloadBlockedWordsFile();
  }

  review(chat: GameChatMessage): ModerationDecision {
    if (!this.config.moderation.enabled) {
      return { action: "allow", reasons: [], chat };
    }

    const message = sanitiseLogText(chat.message);
    const playerName = sanitiseLogText(chat.playerName);
    const reasons: string[] = [];

    if (message.length > this.config.moderation.maxMessageLength) {
      reasons.push("message_length");
    }
    if (
      this.config.moderation.maxRepeatedCharacters > 0 &&
      hasRepeatedCharacters(message, this.config.moderation.maxRepeatedCharacters)
    ) {
      reasons.push("repeated_characters");
    }
    if (this.config.moderation.blockDiscordMentions && /@(everyone|here|[!&]?\d{16,22})/i.test(message)) {
      reasons.push("discord_mention");
    }

    this.reloadBlockedWordsFile();
    for (const term of this.blockedTerms()) {
      if (term && containsBlockedTerm(message, term)) reasons.push(`blocked_term:${term}`);
    }
    for (const regex of this.blockedRegexes) {
      if (regex.test(message)) reasons.push(`blocked_pattern:${regex.source}`);
    }

    return {
      action: reasons.length ? "block" : "allow",
      reasons,
      chat: { ...chat, playerName, message }
    };
  }

  private blockedTerms(): string[] {
    return [...this.config.moderation.blockedTerms, ...this.blockedTermsFromFile];
  }

  private reloadBlockedWordsFile(): void {
    const filePath = path.resolve(this.config.moderation.blockedWordsFile);
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs === this.blockedWordsFileMtime) return;
      this.blockedWordsFileMtime = stat.mtimeMs;
      this.blockedTermsFromFile = fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
    } catch {
      this.blockedTermsFromFile = [];
      this.blockedWordsFileMtime = 0;
    }
  }
}

function containsBlockedTerm(message: string, term: string): boolean {
  const escaped = escapeRegExp(term.trim());
  if (!escaped) return false;
  const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escaped}($|[^A-Za-z0-9_])`, "iu");
  return pattern.test(message);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasRepeatedCharacters(message: string, threshold: number): boolean {
  let last = "";
  let count = 0;
  for (const char of message) {
    if (char === last) {
      count += 1;
      if (count >= threshold) return true;
    } else {
      last = char;
      count = 1;
    }
  }
  return false;
}
