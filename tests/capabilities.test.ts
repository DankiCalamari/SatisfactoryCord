import { describe, expect, it, vi } from "vitest";
import { detectCapabilities } from "../src/satisfactory/capabilities.js";
import { loadConfig } from "../src/config.js";
import type { ProcessManager } from "../src/server/process-manager.js";
import type { SatisfactoryApi } from "../src/satisfactory/api.js";
import type { CommandProvider, GameMessageProvider } from "../src/satisfactory/api-types.js";

describe("detectCapabilities", () => {
  it("does not report stdin as HTTPS RunCommand", async () => {
    process.env.SATISFACTORY_EXECUTABLE = "node";
    process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
    process.env.DISCORD_ENABLED = "false";

    const capabilities = await detectCapabilities(
      loadConfig("missing.yml"),
      {
        snapshot: () => ({ pid: 123, state: "RUNNING", restartCount: 0 }),
        process: { stdout: {} },
        stdin: { available: true }
      } as unknown as ProcessManager,
      { health: vi.fn().mockResolvedValue(true) } as unknown as SatisfactoryApi,
      { name: "FactoryServer stdin", available: true, run: vi.fn() } as CommandProvider,
      { name: "Unavailable", available: false, send: vi.fn() } as GameMessageProvider
    );

    expect(capabilities.httpsApi).toBe(true);
    expect(capabilities.stdin).toBe(true);
    expect(capabilities.runCommand).toBe(false);
  });
});
