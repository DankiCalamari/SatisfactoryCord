import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EventBus, type ServerEvent } from "../src/bridge/event-bus.js";
import { loadConfig } from "../src/config.js";
import { ProcessManager } from "../src/server/process-manager.js";
import { Logger } from "../src/utils/logger.js";

describe("ProcessManager", () => {
  it("launches a child process, captures stdout, and writes stdin", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "satisfactorycord-"));
    process.env.SATISFACTORY_EXECUTABLE = process.execPath;
    process.env.SATISFACTORY_ARGS = path.join(process.cwd(), "tests/fixtures/mock-factory-server.js");
    process.env.SATISFACTORY_WORKING_DIRECTORY = process.cwd();
    process.env.DISCORD_ENABLED = "false";
    process.env.SERVER_CONSOLE_LOG = path.join(temp, "server-console.log");
    process.env.LOG_DIR = temp;
    process.env.AUTO_RESTART = "false";

    const config = loadConfig("missing.yml");
    const bus = new EventBus();
    const logger = new Logger("error", temp);
    const manager = new ProcessManager(config, bus, logger);
    const chatPromise = waitFor(bus, "game-chat");

    await manager.start();
    await expect(chatPromise).resolves.toMatchObject({ type: "game-chat" });
    expect(manager.stdin.available).toBe(true);
    await manager.stdin.sendConsoleInput("quit");
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(manager.snapshot().state).toBe("STOPPED");
  });
});

function waitFor(bus: EventBus, type: ServerEvent["type"]): Promise<ServerEvent> {
  return new Promise((resolve) => {
    const unsubscribe = bus.onEvent((event) => {
      if (event.type !== type) return;
      unsubscribe();
      resolve(event);
    });
  });
}
