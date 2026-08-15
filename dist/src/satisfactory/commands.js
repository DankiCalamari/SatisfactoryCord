import { assertSafeConsoleCommand, sanitiseGameMessage } from "../utils/sanitise.js";
export class ApiRunCommandProvider {
    api;
    name = "HTTPS API RunCommand";
    available = false;
    constructor(api) {
        this.api = api;
    }
    async detect() {
        try {
            await this.api.runCommand("help");
            this.available = true;
        }
        catch {
            this.available = false;
        }
    }
    async run(command) {
        if (!this.available)
            throw new Error("RunCommand is unavailable.");
        const safe = assertSafeConsoleCommand(command);
        return { ok: true, output: await this.api.runCommand(safe), provider: this.name };
    }
}
export class StdinCommandProvider {
    stdin;
    name = "FactoryServer stdin";
    constructor(stdin) {
        this.stdin = stdin;
    }
    get available() {
        return this.stdin.available;
    }
    async run(command) {
        await this.stdin.sendConsoleInput(command);
        return { ok: true, output: "", provider: this.name };
    }
}
export class UnavailableCommandProvider {
    name = "Unavailable";
    available = false;
    async run(_command) {
        throw new Error("No vanilla command provider is available.");
    }
}
export class UnavailableMessageProvider {
    name = "Unavailable";
    available = false;
    async send(_message) {
        throw new Error("Vanilla Satisfactory has no verified arbitrary broadcast provider configured.");
    }
}
export class StrictConsoleMessageProvider {
    provider;
    commandName;
    name;
    available;
    constructor(provider, commandName) {
        this.provider = provider;
        this.commandName = commandName;
        this.name = `${provider.name} message`;
        this.available = Boolean(commandName && provider.available);
    }
    async send(message) {
        if (!this.commandName || !this.available)
            throw new Error("Game message relay is unavailable.");
        const formatted = sanitiseGameMessage("Discord", message);
        const encoded = encodeAsSingleArgument(formatted);
        await this.provider.run(`${this.commandName} ${encoded}`);
    }
}
export function encodeAsSingleArgument(message) {
    if (/["\\;\r\n`|&<>]/.test(message))
        throw new Error("Message cannot be safely encoded for console injection.");
    return `"${message}"`;
}
