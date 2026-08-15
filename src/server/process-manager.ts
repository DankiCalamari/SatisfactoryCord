import fs from "node:fs";
import path from "node:path";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { AppConfig } from "../config.js";
import { EventBus } from "../bridge/event-bus.js";
import type { Logger } from "../utils/logger.js";
import { Lifecycle } from "./lifecycle.js";
import { RestartManager } from "./restart-manager.js";
import { launchServer } from "./server-launcher.js";
import { StdinController } from "./stdin.js";
import { StdoutParser } from "./stdout-parser.js";

export class ProcessManager {
  private child?: ChildProcessWithoutNullStreams;
  private readonly lifecycle = new Lifecycle();
  private readonly restartManager: RestartManager;
  private intentionalStop = false;
  private readonly stdinController = new StdinController(() => this.child);

  constructor(private readonly config: AppConfig, private readonly bus: EventBus, private readonly logger: Logger) {
    this.restartManager = new RestartManager(
      config.server.maxCrashRestarts,
      config.server.crashRestartWindow,
      config.server.autoRestartDelay
    );
    fs.mkdirSync(path.dirname(config.logging.serverConsoleLog), { recursive: true });
  }

  get stdin(): StdinController {
    return this.stdinController;
  }

  get process(): ChildProcessWithoutNullStreams | undefined {
    return this.child;
  }

  snapshot() {
    return this.lifecycle.get();
  }

  async start(): Promise<void> {
    if (this.child) throw new Error("FactoryServer is already running.");
    this.intentionalStop = false;
    this.lifecycle.starting();
    this.logger.info("Starting FactoryServer...");
    const child = launchServer(this.config);
    this.child = child;
    const parser = new StdoutParser();
    const consoleLog = fs.createWriteStream(this.config.logging.serverConsoleLog, { flags: "a" });

    child.stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(`[factory] ${chunk.toString()}`);
      consoleLog.write(chunk);
      for (const event of parser.push(chunk)) this.bus.publish(event);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(`[factory:err] ${chunk.toString()}`);
      consoleLog.write(chunk);
      for (const event of parser.push(chunk)) this.bus.publish(event);
    });
    child.on("spawn", () => {
      this.lifecycle.running(child.pid);
      this.logger.info(`FactoryServer started with PID ${child.pid ?? "unknown"}.`);
      this.bus.publish({ type: "server-started", timestamp: new Date(), pid: child.pid });
    });
    child.on("error", (error) => {
      this.logger.error("Failed to launch FactoryServer.", { error: error.message });
    });
    child.on("exit", (code, signal) => {
      for (const event of parser.flush()) this.bus.publish(event);
      consoleLog.end();
      this.child = undefined;
      const crashed = !this.intentionalStop && code !== 0;
      if (crashed) {
        this.lifecycle.crashed(code, signal);
        this.bus.publish({ type: "server-crashed", timestamp: new Date(), code, signal });
        this.handleCrash(code, signal);
      } else {
        this.lifecycle.stopped(code, signal);
        this.bus.publish({ type: "server-stopped", timestamp: new Date(), code, signal });
      }
    });
  }

  async stop(timeoutMs = 30_000): Promise<void> {
    if (!this.child) return;
    this.intentionalStop = true;
    this.lifecycle.stopping();
    this.logger.info("Stopping FactoryServer gracefully.");
    await this.tryConsole("SaveGame");
    await this.tryConsole("quit");
    await this.waitForExit(timeoutMs).catch(() => {
      if (this.child) {
        this.logger.warning("FactoryServer did not exit after graceful request; sending terminate signal.");
        this.child.kill("SIGTERM");
      }
    });
    await this.waitForExit(10_000).catch(() => {
      if (this.child) {
        this.logger.error("FactoryServer did not terminate; force killing as last resort.");
        this.child.kill("SIGKILL");
      }
    });
  }

  async restart(): Promise<void> {
    this.lifecycle.restarting();
    await this.stop();
    this.lifecycle.restarted();
    await this.start();
  }

  private async tryConsole(command: string): Promise<void> {
    if (!this.stdin.available) return;
    try {
      await this.stdin.sendConsoleInput(command);
    } catch (error) {
      this.logger.debug(`Console command '${command}' was not accepted.`, {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private waitForExit(timeoutMs: number): Promise<void> {
    if (!this.child) return Promise.resolve();
    const child = this.child;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for FactoryServer exit.")), timeoutMs);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  private handleCrash(code: number | null, signal: NodeJS.Signals | null): void {
    this.logger.error(`FactoryServer exited unexpectedly with code ${code ?? "null"} and signal ${signal ?? "null"}.`);
    if (!this.config.server.autoRestart) return;
    const decision = this.restartManager.recordCrash();
    if (!decision.allowed) {
      this.logger.error("Automatic restart disabled because crash loop limit was reached.");
      return;
    }
    this.logger.warning(`Restarting FactoryServer in ${decision.delayMs / 1000} seconds.`);
    setTimeout(() => {
      this.lifecycle.restarted();
      this.start().catch((error) => this.logger.error("Automatic restart failed.", { error }));
    }, decision.delayMs).unref();
  }
}
