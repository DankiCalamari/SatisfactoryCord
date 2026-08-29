import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/bridge/event-bus.js";
import { GameChatFilter } from "../src/bridge/game-chat-filter.js";
import { loadConfig } from "../src/config.js";
const oldEnv = { ...process.env };
afterEach(() => {
    process.env = { ...oldEnv };
});
describe("GameChatFilter", () => {
    it("blocks moderated chat before the next relay", async () => {
        process.env.CHAT_MODERATION_ENABLED = "true";
        process.env.CHAT_BLOCKED_TERMS = "badword";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const config = loadConfig("missing.yml");
        const bus = new EventBus();
        const events = [];
        bus.onEvent((event) => events.push(event));
        const next = vi.fn();
        const filter = new GameChatFilter(config, bus, next);
        await filter.handle({
            type: "game-chat",
            chat: { timestamp: new Date(), playerName: "Beau", message: "badword" }
        });
        expect(next).not.toHaveBeenCalled();
        expect(events.some((event) => event.type === "chat-moderation")).toBe(true);
    });
    it("passes allowed chat to the next relay", async () => {
        process.env.CHAT_MODERATION_ENABLED = "true";
        process.env.CHAT_BLOCKED_TERMS = "badword";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const next = vi.fn();
        const filter = new GameChatFilter(loadConfig("missing.yml"), new EventBus(), next);
        await filter.handle({
            type: "game-chat",
            chat: { timestamp: new Date(), playerName: "Beau", message: "hello" }
        });
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            type: "game-chat"
        }));
    });
});
