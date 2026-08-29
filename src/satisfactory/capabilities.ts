import fs from "node:fs";
import type { AppConfig } from "../config.js";
import type { ProcessManager } from "../server/process-manager.js";
import type { SatisfactoryApi } from "./api.js";
import type { CommandProvider, GameMessageProvider } from "./api-types.js";

export interface Capabilities {
  processControl: boolean;
  stdoutCapture: boolean;
  stdin: boolean;
  factoryGameLog: boolean;
  httpsApi: boolean;
  runCommand: boolean;
  gameToDiscordChat: boolean;
  discordToGameChat: boolean;
}

export async function detectCapabilities(
  config: AppConfig,
  processManager: ProcessManager,
  api: SatisfactoryApi,
  commandProvider: CommandProvider,
  messageProvider: GameMessageProvider
): Promise<Capabilities> {
  const httpsApi = await api.health();
  return {
    processControl: Boolean(processManager.snapshot().pid),
    stdoutCapture: Boolean(processManager.process?.stdout),
    stdin: processManager.stdin.available,
    factoryGameLog: Boolean(config.server.logPath && fs.existsSync(config.server.logPath)),
    httpsApi,
    runCommand: commandProvider.name === "HTTPS API RunCommand" && commandProvider.available,
    gameToDiscordChat: true,
    discordToGameChat: messageProvider.available
  };
}

export function formatCapabilities(capabilities: Capabilities): string {
  const row = (name: string, available: boolean) => `${name.padEnd(24)} ${available ? "AVAILABLE" : "UNSUPPORTED"}`;
  return [
    "SatisfactoryCord capabilities",
    "",
    row("Process Control", capabilities.processControl),
    row("stdout Capture", capabilities.stdoutCapture),
    row("stdin Control", capabilities.stdin),
    row("FactoryGame.log", capabilities.factoryGameLog),
    row("HTTPS API", capabilities.httpsApi),
    row("RunCommand", capabilities.runCommand),
    row("Game -> Discord chat", capabilities.gameToDiscordChat),
    row("Discord -> Game chat", capabilities.discordToGameChat)
  ].join("\n");
}
