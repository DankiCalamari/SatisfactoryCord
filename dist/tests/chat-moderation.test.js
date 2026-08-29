import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ChatModerator } from "../src/bridge/chat-moderation.js";
import { loadConfig } from "../src/config.js";
const oldEnv = { ...process.env };
afterEach(() => {
    process.env = { ...oldEnv };
});
describe("ChatModerator", () => {
    it("blocks configured terms and Discord mentions", () => {
        process.env.CHAT_MODERATION_ENABLED = "true";
        process.env.CHAT_BLOCKED_TERMS = "badword";
        process.env.CHAT_BLOCK_DISCORD_MENTIONS = "true";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const moderator = new ChatModerator(loadConfig("missing.yml"));
        const decision = moderator.review({
            timestamp: new Date(),
            playerName: "Beau",
            message: "badword @everyone"
        });
        expect(decision.action).toBe("block");
        expect(decision.reasons).toContain("blocked_term:badword");
        expect(decision.reasons).toContain("discord_mention");
    });
    it("allows normal chat when moderation is enabled", () => {
        process.env.CHAT_MODERATION_ENABLED = "true";
        process.env.CHAT_BLOCKED_TERMS = "badword";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const moderator = new ChatModerator(loadConfig("missing.yml"));
        const decision = moderator.review({
            timestamp: new Date(),
            playerName: "Ada",
            message: "normal factory chatter"
        });
        expect(decision.action).toBe("allow");
    });
    it("does not match blocked words inside friendly words", () => {
        process.env.CHAT_MODERATION_ENABLED = "true";
        process.env.CHAT_BLOCKED_TERMS = "hell";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const moderator = new ChatModerator(loadConfig("missing.yml"));
        const decision = moderator.review({
            timestamp: new Date(),
            playerName: "Ada",
            message: "hello factory"
        });
        expect(decision.action).toBe("allow");
    });
    it("loads blocked words from a separate file", () => {
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), "satisfactorycord-words-"));
        const words = path.join(temp, "blocked-words.txt");
        fs.writeFileSync(words, "factory bully\n# ignored comment\n", "utf8");
        process.env.CHAT_MODERATION_ENABLED = "true";
        process.env.CHAT_BLOCKED_WORDS_FILE = words;
        process.env.CHAT_BLOCKED_TERMS = "";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const moderator = new ChatModerator(loadConfig("missing.yml"));
        const decision = moderator.review({
            timestamp: new Date(),
            playerName: "Ada",
            message: "that is factory bully behavior"
        });
        expect(decision.action).toBe("block");
        expect(decision.reasons).toContain("blocked_term:factory bully");
    });
});
