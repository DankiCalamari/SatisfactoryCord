#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { EventBus } from "./bridge/event-bus.js";
import { NormalisedRelay } from "./bridge/relay.js";
import { Logger } from "./utils/logger.js";
import { ProcessManager } from "./server/process-manager.js";
import { LogWatcher } from "./server/log-watcher.js";
import { attachInteractiveConsole } from "./server/stdin.js";
import { SatisfactoryApi } from "./satisfactory/api.js";
import {
  ApiRunCommandProvider,
  StdinCommandProvider,
  StrictConsoleMessageProvider,
  UnavailableCommandProvider,
  UnavailableMessageProvider
} from "./satisfactory/commands.js";
import type { CommandProvider, GameMessageProvider } from "./satisfactory/api-types.js";
import type { Capabilities } from "./satisfactory/capabilities.js";
import { detectCapabilities, formatCapabilities } from "./satisfactory/capabilities.js";
import { createDiscordClient } from "./discord/client.js";
import { DiscordRelay } from "./discord/relay.js";
import { startWebServer } from "./web/server.js";
import { runSteamCmd } from "./server/install.js";
import { InGameAdminCommands } from "./satisfactory/in-game-admin.js";
import { GameChatFilter } from "./bridge/game-chat-filter.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logging.level, config.logging.logDir);

  const cli = process.argv[2];
  if (cli === "install" || cli === "update" || cli === "verify") {
    await runSteamCmd(config, logger, cli);
    return;
  }

  const bus = new EventBus();
  const processManager = new ProcessManager(config, bus, logger);
  const api = new SatisfactoryApi(config, logger);
  const apiCommandProvider = new ApiRunCommandProvider(api);
  const stdinCommandProvider = new StdinCommandProvider(processManager.stdin);
  let commandProvider: CommandProvider = new UnavailableCommandProvider();
  let messageProvider: GameMessageProvider = new UnavailableMessageProvider();
  let discordConnected = false;
  let capabilities: Capabilities = {
    processControl: false,
    stdoutCapture: false,
    stdin: false,
    factoryGameLog: false,
    httpsApi: false,
    runCommand: false,
    gameToDiscordChat: false,
    discordToGameChat: false
  };

  console.log(startupBanner(config.server.executable, config.server.workingDirectory));

  const webServer = startWebServer(config, processManager, () => discordConnected, () => capabilities);
  logger.info(`Web dashboard listening on http://${config.web.host}:${config.web.port}/`);

  await processManager.start();

  const logWatcher = config.server.logPath ? new LogWatcher(config.server.logPath, bus, logger) : undefined;
  logWatcher?.start();

  await apiCommandProvider.detect();
  commandProvider = apiCommandProvider.available ? apiCommandProvider : stdinCommandProvider.available ? stdinCommandProvider : commandProvider;

  const verifiedBroadcastCommand = process.env.SATISFACTORY_VERIFIED_BROADCAST_COMMAND;
  if (verifiedBroadcastCommand) {
    messageProvider = new StrictConsoleMessageProvider(commandProvider, verifiedBroadcastCommand);
  }

  capabilities = await detectCapabilities(config, processManager, api, commandProvider, messageProvider);
  console.log(formatCapabilities(capabilities));

  const discordRuntime = await createDiscordClient(
    config,
    logger,
    processManager,
    api,
    commandProvider,
    messageProvider,
    () => capabilities
  );
  discordConnected = discordRuntime.connected;
  const inGameAdmin = new InGameAdminCommands(
    config,
    logger,
    bus,
    processManager,
    api,
    commandProvider,
    messageProvider,
    () => capabilities
  );
  const stopInGameAdmin = bus.onEvent((event) => {
    if (event.type === "game-chat") {
      void inGameAdmin.handleChat(event.chat);
    }
  });
  const discordRelay = new DiscordRelay(discordRuntime.client, config, logger);
  const gameChatFilter = new GameChatFilter(config, bus, (event) => discordRelay.handle(event));
  const stopRelay = new NormalisedRelay(bus, (event) => gameChatFilter.handle(event)).start();

  attachInteractiveConsole(
    async (line) => handleWrapperCommand(line, processManager, api, commandProvider, capabilities, logger),
    async (line) => commandProvider.run(line).then((result) => {
      if (result.output) console.log(result.output);
    })
  );

  const shutdown = async (): Promise<void> => {
    logger.info("SatisfactoryCord shutting down.");
    stopRelay();
    stopInGameAdmin();
    logWatcher?.stop();
    await processManager.stop();
    await discordRuntime.client.destroy();
    await new Promise<void>((resolve) => webServer.close(() => resolve()));
  };
  process.on("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.on("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
}

async function handleWrapperCommand(
  line: string,
  processManager: ProcessManager,
  api: SatisfactoryApi,
  commandProvider: { run(command: string): Promise<{ output: string }> },
  capabilities: Capabilities,
  logger: Logger
): Promise<void> {
  const [command, ...rest] = line.replace(/^\/wrapper\s*/, "").split(/\s+/);
  switch (command) {
    case "":
    case "help":
      console.log("Commands: help, status, players, save, restart, stop, start, console <command>, capabilities, quit");
      break;
    case "status":
      console.log(JSON.stringify(processManager.snapshot(), null, 2));
      break;
    case "players":
      console.log(JSON.stringify(await api.queryServerState().catch((error) => ({ error: String(error) })), null, 2));
      break;
    case "save":
      await api.saveGame();
      console.log("Save requested.");
      break;
    case "restart":
      await processManager.restart();
      break;
    case "stop":
      await processManager.stop();
      break;
    case "start":
      await processManager.start();
      break;
    case "console": {
      const result = await commandProvider.run(rest.join(" "));
      if (result.output) console.log(result.output);
      break;
    }
    case "capabilities":
      console.log(formatCapabilities(capabilities));
      break;
    case "discord":
      console.log("Discord status is available in the web dashboard and logs.");
      break;
    case "quit":
      await processManager.stop();
      process.exit(0);
      break;
    default:
      logger.warning(`Unknown wrapper command '${command}'.`);
  }
}

function startupBanner(executable: string, workingDirectory: string): string {
  return [
    "=======================================================",
    "                  SatisfactoryCord",
    "=======================================================",
    "",
    "Installation",
    `  Executable          ${executable}`,
    `  Working directory   ${workingDirectory}`,
    "",
    "Mods",
    "  Required            NO",
    "",
    "======================================================="
  ].join("\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
