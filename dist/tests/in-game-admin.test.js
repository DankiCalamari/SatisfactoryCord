import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/bridge/event-bus.js";
import { loadConfig } from "../src/config.js";
import { InGameAdminCommands } from "../src/satisfactory/in-game-admin.js";
const oldEnv = { ...process.env };
afterEach(() => {
    process.env = { ...oldEnv };
});
describe("InGameAdminCommands", () => {
    it("runs authorised in-game status commands", async () => {
        process.env.IN_GAME_ADMIN_ENABLED = "true";
        process.env.IN_GAME_ADMIN_PLAYERS = "Beau";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const events = [];
        const bus = new EventBus();
        bus.onEvent((event) => events.push(event));
        const runtime = new InGameAdminCommands(loadConfig("missing.yml"), { info: vi.fn(), warning: vi.fn() }, bus, { snapshot: () => ({ state: "RUNNING", restartCount: 0 }) }, { queryServerState: vi.fn() }, { available: false, name: "none", run: vi.fn() }, { available: false, name: "none", send: vi.fn() }, () => ({
            processControl: true,
            stdoutCapture: true,
            stdin: true,
            factoryGameLog: false,
            httpsApi: false,
            runCommand: false,
            gameToDiscordChat: true,
            discordToGameChat: false
        }));
        await expect(runtime.handleChat({ timestamp: new Date(), playerName: "Beau", message: "!sc status" })).resolves.toBe(true);
        expect(events.some((event) => event.type === "admin-command" && event.outcome === "Server state: RUNNING")).toBe(true);
    });
    it("denies non-admin players", async () => {
        process.env.IN_GAME_ADMIN_ENABLED = "true";
        process.env.IN_GAME_ADMIN_PLAYERS = "Beau";
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const events = [];
        const bus = new EventBus();
        bus.onEvent((event) => events.push(event));
        const runtime = new InGameAdminCommands(loadConfig("missing.yml"), { info: vi.fn(), warning: vi.fn() }, bus, { snapshot: vi.fn() }, {}, { available: false, name: "none", run: vi.fn() }, { available: false, name: "none", send: vi.fn() }, vi.fn());
        await runtime.handleChat({ timestamp: new Date(), playerName: "Ren", message: "!sc stop" });
        expect(events.some((event) => event.type === "admin-command" && event.outcome.includes("Denied"))).toBe(true);
    });
});
