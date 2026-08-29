import { describe, expect, it, vi } from "vitest";
import { detectCapabilities } from "../src/satisfactory/capabilities.js";
import { loadConfig } from "../src/config.js";
describe("detectCapabilities", () => {
    it("does not report stdin as HTTPS RunCommand", async () => {
        process.env.SATISFACTORY_EXECUTABLE = "node";
        process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
        process.env.DISCORD_ENABLED = "false";
        const capabilities = await detectCapabilities(loadConfig("missing.yml"), {
            snapshot: () => ({ pid: 123, state: "RUNNING", restartCount: 0 }),
            process: { stdout: {} },
            stdin: { available: true }
        }, { health: vi.fn().mockResolvedValue(true) }, { name: "FactoryServer stdin", available: true, run: vi.fn() }, { name: "Unavailable", available: false, send: vi.fn() });
        expect(capabilities.httpsApi).toBe(true);
        expect(capabilities.stdin).toBe(true);
        expect(capabilities.runCommand).toBe(false);
    });
});
