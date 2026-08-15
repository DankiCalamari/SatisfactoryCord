import fs from "node:fs";
import path from "node:path";
import { Lifecycle } from "./lifecycle.js";
import { RestartManager } from "./restart-manager.js";
import { launchServer } from "./server-launcher.js";
import { StdinController } from "./stdin.js";
import { StdoutParser } from "./stdout-parser.js";
export class ProcessManager {
    config;
    bus;
    logger;
    child;
    lifecycle = new Lifecycle();
    restartManager;
    intentionalStop = false;
    stdinController = new StdinController(() => this.child);
    constructor(config, bus, logger) {
        this.config = config;
        this.bus = bus;
        this.logger = logger;
        this.restartManager = new RestartManager(config.server.maxCrashRestarts, config.server.crashRestartWindow, config.server.autoRestartDelay);
        fs.mkdirSync(path.dirname(config.logging.serverConsoleLog), { recursive: true });
    }
    get stdin() {
        return this.stdinController;
    }
    get process() {
        return this.child;
    }
    snapshot() {
        return this.lifecycle.get();
    }
    async start() {
        if (this.child)
            throw new Error("FactoryServer is already running.");
        this.intentionalStop = false;
        this.lifecycle.starting();
        this.logger.info("Starting FactoryServer...");
        const child = launchServer(this.config);
        this.child = child;
        const parser = new StdoutParser();
        const consoleLog = fs.createWriteStream(this.config.logging.serverConsoleLog, { flags: "a" });
        child.stdout.on("data", (chunk) => {
            process.stdout.write(`[factory] ${chunk.toString()}`);
            consoleLog.write(chunk);
            for (const event of parser.push(chunk))
                this.bus.publish(event);
        });
        child.stderr.on("data", (chunk) => {
            process.stderr.write(`[factory:err] ${chunk.toString()}`);
            consoleLog.write(chunk);
            for (const event of parser.push(chunk))
                this.bus.publish(event);
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
            for (const event of parser.flush())
                this.bus.publish(event);
            consoleLog.end();
            this.child = undefined;
            const crashed = !this.intentionalStop && code !== 0;
            if (crashed) {
                this.lifecycle.crashed(code, signal);
                this.bus.publish({ type: "server-crashed", timestamp: new Date(), code, signal });
                this.handleCrash(code, signal);
            }
            else {
                this.lifecycle.stopped(code, signal);
                this.bus.publish({ type: "server-stopped", timestamp: new Date(), code, signal });
            }
        });
    }
    async stop(timeoutMs = 30_000) {
        if (!this.child)
            return;
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
    async restart() {
        this.lifecycle.restarting();
        await this.stop();
        this.lifecycle.restarted();
        await this.start();
    }
    async tryConsole(command) {
        if (!this.stdin.available)
            return;
        try {
            await this.stdin.sendConsoleInput(command);
        }
        catch (error) {
            this.logger.debug(`Console command '${command}' was not accepted.`, {
                error: error instanceof Error ? error.message : error
            });
        }
    }
    waitForExit(timeoutMs) {
        if (!this.child)
            return Promise.resolve();
        const child = this.child;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Timed out waiting for FactoryServer exit.")), timeoutMs);
            child.once("exit", () => {
                clearTimeout(timer);
                resolve();
            });
        });
    }
    handleCrash(code, signal) {
        this.logger.error(`FactoryServer exited unexpectedly with code ${code ?? "null"} and signal ${signal ?? "null"}.`);
        if (!this.config.server.autoRestart)
            return;
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
