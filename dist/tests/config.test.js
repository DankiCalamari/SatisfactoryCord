import { describe, expect, it, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";
const oldEnv = { ...process.env };
afterEach(() => {
    process.env = { ...oldEnv };
});
describe("loadConfig", () => {
    it("splits Satisfactory args without shell interpolation", () => {
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.SATISFACTORY_ARGS = '-Port=7777 "two words"';
        process.env.DISCORD_ENABLED = "false";
        const config = loadConfig("missing.yml");
        expect(config.server.args).toEqual(["-Port=7777", "two words"]);
    });
});
