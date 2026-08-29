import { formatCapabilities } from "./capabilities.js";
import { sanitiseLogText } from "../utils/sanitise.js";
export class InGameAdminCommands {
    config;
    logger;
    bus;
    processManager;
    api;
    commandProvider;
    messageProvider;
    getCapabilities;
    constructor(config, logger, bus, processManager, api, commandProvider, messageProvider, getCapabilities) {
        this.config = config;
        this.logger = logger;
        this.bus = bus;
        this.processManager = processManager;
        this.api = api;
        this.commandProvider = commandProvider;
        this.messageProvider = messageProvider;
        this.getCapabilities = getCapabilities;
    }
    isCommand(chat) {
        return sanitiseLogText(chat.message).startsWith(this.config.inGameAdmin.prefix);
    }
    async handleChat(chat) {
        if (!this.config.inGameAdmin.enabled || !this.isCommand(chat))
            return false;
        const playerName = sanitiseLogText(chat.playerName);
        const body = sanitiseLogText(chat.message).slice(this.config.inGameAdmin.prefix.length).trim();
        const [command = "help", ...args] = body.split(/\s+/).filter(Boolean);
        if (!this.isAuthorised(playerName)) {
            this.audit(`Denied in-game admin command from ${playerName}: ${command}`);
            await this.respond(playerName, "You are not authorised to run SatisfactoryCord commands.");
            return true;
        }
        this.audit(`In-game admin ${playerName} executed: ${command}${args.length ? ` ${args.join(" ")}` : ""}`);
        try {
            await this.execute(playerName, command.toLowerCase(), args);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warning(`In-game admin command failed: ${message}`);
            await this.respond(playerName, `Command failed: ${message}`);
        }
        return true;
    }
    isAuthorised(playerName) {
        const admins = this.config.inGameAdmin.adminPlayers;
        if (!admins.length)
            return false;
        if (this.config.inGameAdmin.requireExactNameMatch)
            return admins.includes(playerName);
        return admins.some((admin) => admin.toLocaleLowerCase() === playerName.toLocaleLowerCase());
    }
    async execute(playerName, command, args) {
        switch (command) {
            case "help":
                await this.respond(playerName, "Commands: help, status, players, save, restart, stop, start, capabilities, console");
                return;
            case "status":
                await this.respond(playerName, `Server state: ${this.processManager.snapshot().state}`);
                return;
            case "players": {
                const state = await this.api.queryServerState();
                await this.respond(playerName, `Players: ${state.serverGameState?.numConnectedPlayers ?? "unknown"}`);
                return;
            }
            case "save":
                await this.api.saveGame();
                await this.respond(playerName, "Save requested.");
                return;
            case "restart":
                await this.respond(playerName, "Restart requested.");
                await this.processManager.restart();
                return;
            case "stop":
                await this.respond(playerName, "Stop requested.");
                await this.processManager.stop();
                return;
            case "start":
                await this.processManager.start();
                await this.respond(playerName, "Start requested.");
                return;
            case "capabilities":
                await this.respond(playerName, compactCapabilities(this.getCapabilities()));
                return;
            case "console": {
                if (!this.config.inGameAdmin.allowConsole) {
                    throw new Error("in-game console command execution is disabled.");
                }
                const raw = args.join(" ");
                const result = await this.commandProvider.run(raw);
                await this.respond(playerName, result.output ? result.output.slice(0, 300) : "Console command sent.");
                return;
            }
            default:
                await this.respond(playerName, `Unknown command '${command}'. Use ${this.config.inGameAdmin.prefix} help.`);
        }
    }
    async respond(playerName, message) {
        const clean = sanitiseLogText(message).slice(0, 450);
        if (this.messageProvider.available) {
            await this.messageProvider.send(`[SatisfactoryCord -> ${playerName}] ${clean}`);
            return;
        }
        this.bus.publish({
            type: "admin-command",
            timestamp: new Date(),
            playerName,
            command: "response",
            outcome: clean
        });
    }
    audit(message) {
        this.logger.info(message);
        this.bus.publish({
            type: "admin-command",
            timestamp: new Date(),
            playerName: "",
            command: "audit",
            outcome: message
        });
    }
}
function compactCapabilities(capabilities) {
    return formatCapabilities(capabilities)
        .split("\n")
        .filter((line) => line.includes("AVAILABLE") || line.includes("UNSUPPORTED"))
        .join("; ")
        .slice(0, 450);
}
