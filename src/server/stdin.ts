import type { ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import { assertSafeConsoleCommand } from "../utils/sanitise.js";

export class StdinController {
  constructor(private getProcess: () => ChildProcessWithoutNullStreams | undefined) {}

  get available(): boolean {
    const proc = this.getProcess();
    return Boolean(proc?.stdin?.writable && !proc.stdin.destroyed);
  }

  async sendConsoleInput(command: string): Promise<void> {
    const proc = this.getProcess();
    if (!proc?.stdin?.writable) throw new Error("FactoryServer stdin is not writable.");
    const clean = assertSafeConsoleCommand(command, 500);
    await new Promise<void>((resolve, reject) => {
      proc.stdin.write(`${clean}\n`, (error) => (error ? reject(error) : resolve()));
    });
  }
}

export function attachInteractiveConsole(
  onWrapperCommand: (line: string) => Promise<void>,
  onServerCommand: (line: string) => Promise<void>
): readline.Interface | undefined {
  if (!process.stdin.isTTY) return undefined;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "SatisfactoryCord> " });
  rl.on("line", (raw) => {
    const line = raw.trim();
    const serverLine = line.startsWith("/sf ") ? line.slice(4) : undefined;
    const promise = serverLine === undefined ? onWrapperCommand(line) : onServerCommand(serverLine);
    promise.catch((error: unknown) => {
      console.error(`[wrapper] ${error instanceof Error ? error.message : String(error)}`);
    }).finally(() => rl.prompt());
  });
  rl.prompt();
  return rl;
}
