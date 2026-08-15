import type { CommandProvider, CommandResult, GameMessageProvider } from "./api-types.js";
import { assertSafeConsoleCommand, sanitiseGameMessage } from "../utils/sanitise.js";
import type { SatisfactoryApi } from "./api.js";
import type { StdinController } from "../server/stdin.js";

export class ApiRunCommandProvider implements CommandProvider {
  name = "HTTPS API RunCommand";
  available = false;
  constructor(private readonly api: SatisfactoryApi) {}

  async detect(): Promise<void> {
    try {
      await this.api.runCommand("help");
      this.available = true;
    } catch {
      this.available = false;
    }
  }

  async run(command: string): Promise<CommandResult> {
    if (!this.available) throw new Error("RunCommand is unavailable.");
    const safe = assertSafeConsoleCommand(command);
    return { ok: true, output: await this.api.runCommand(safe), provider: this.name };
  }
}

export class StdinCommandProvider implements CommandProvider {
  name = "FactoryServer stdin";
  constructor(private readonly stdin: StdinController) {}

  get available(): boolean {
    return this.stdin.available;
  }

  async run(command: string): Promise<CommandResult> {
    await this.stdin.sendConsoleInput(command);
    return { ok: true, output: "", provider: this.name };
  }
}

export class UnavailableCommandProvider implements CommandProvider {
  name = "Unavailable";
  available = false;
  async run(_command: string): Promise<CommandResult> {
    throw new Error("No vanilla command provider is available.");
  }
}

export class UnavailableMessageProvider implements GameMessageProvider {
  readonly name = "Unavailable";
  readonly available = false;
  async send(_message: string): Promise<void> {
    throw new Error("Vanilla Satisfactory has no verified arbitrary broadcast provider configured.");
  }
}

export class StrictConsoleMessageProvider implements GameMessageProvider {
  readonly name: string;
  readonly available: boolean;

  constructor(private readonly provider: CommandProvider, private readonly commandName: string | undefined) {
    this.name = `${provider.name} message`;
    this.available = Boolean(commandName && provider.available);
  }

  async send(message: string): Promise<void> {
    if (!this.commandName || !this.available) throw new Error("Game message relay is unavailable.");
    const formatted = sanitiseGameMessage("Discord", message);
    const encoded = encodeAsSingleArgument(formatted);
    await this.provider.run(`${this.commandName} ${encoded}`);
  }
}

export function encodeAsSingleArgument(message: string): string {
  if (/["\\;\r\n`|&<>]/.test(message)) throw new Error("Message cannot be safely encoded for console injection.");
  return `"${message}"`;
}
