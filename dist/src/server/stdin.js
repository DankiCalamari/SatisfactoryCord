import readline from "node:readline";
import { assertSafeConsoleCommand } from "../utils/sanitise.js";
export class StdinController {
    getProcess;
    constructor(getProcess) {
        this.getProcess = getProcess;
    }
    get available() {
        const proc = this.getProcess();
        return Boolean(proc?.stdin?.writable && !proc.stdin.destroyed);
    }
    async sendConsoleInput(command) {
        const proc = this.getProcess();
        if (!proc?.stdin?.writable)
            throw new Error("FactoryServer stdin is not writable.");
        const clean = assertSafeConsoleCommand(command, 500);
        await new Promise((resolve, reject) => {
            proc.stdin.write(`${clean}\n`, (error) => (error ? reject(error) : resolve()));
        });
    }
}
export function attachInteractiveConsole(onWrapperCommand, onServerCommand) {
    if (!process.stdin.isTTY)
        return undefined;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "SatisfactoryCord> " });
    rl.on("line", (raw) => {
        const line = raw.trim();
        const serverLine = line.startsWith("/sf ") ? line.slice(4) : undefined;
        const promise = serverLine === undefined ? onWrapperCommand(line) : onServerCommand(serverLine);
        promise.catch((error) => {
            console.error(`[wrapper] ${error instanceof Error ? error.message : String(error)}`);
        }).finally(() => rl.prompt());
    });
    rl.prompt();
    return rl;
}
