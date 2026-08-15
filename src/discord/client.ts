import {
  ActivityType,
  Client,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
  type Message
} from "discord.js";
import type { AppConfig } from "../config.js";
import type { Logger } from "../utils/logger.js";
import type { ProcessManager } from "../server/process-manager.js";
import type { SatisfactoryApi } from "../satisfactory/api.js";
import type { CommandProvider, GameMessageProvider } from "../satisfactory/api-types.js";
import type { Capabilities } from "../satisfactory/capabilities.js";
import { capabilitiesEmbed, statusEmbed } from "./embeds.js";
import { isAdminInteraction } from "./permissions.js";
import { registerDiscordCommands } from "./commands.js";
import { sanitiseGameMessage } from "../utils/sanitise.js";

export interface DiscordRuntime {
  client: Client;
  connected: boolean;
}

export async function createDiscordClient(
  config: AppConfig,
  logger: Logger,
  processManager: ProcessManager,
  api: SatisfactoryApi,
  commandProvider: CommandProvider,
  messageProvider: GameMessageProvider,
  getCapabilities: () => Capabilities
): Promise<DiscordRuntime> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  if (!config.discord.enabled) {
    logger.info("Discord disabled by configuration.");
    return { client, connected: false };
  }
  if (!config.discord.token) throw new Error("DISCORD_TOKEN is required when Discord is enabled.");

  client.once("ready", async () => {
    logger.info(`Discord connected as ${client.user?.tag ?? "unknown"}.`);
    if (client.user?.id) await registerDiscordCommands(config, client.user.id);
    setPresence(client, processManager.snapshot().state);
  });

  client.on("interactionCreate", (interaction) => {
    if (interaction.isChatInputCommand()) {
      void handleSlashCommand(interaction, config, logger, processManager, api, commandProvider, getCapabilities);
    }
  });

  client.on("messageCreate", (message) => {
    void handleDiscordMessage(message, config, messageProvider);
  });

  await client.login(config.discord.token);
  return { client, connected: true };
}

function setPresence(client: Client, state: string, players?: number): void {
  const name =
    state === "RUNNING"
      ? `Sunset Factory${players === undefined ? "" : ` - ${players} players`}`
      : state === "STARTING"
        ? "factory starting..."
        : "factory offline";
  client.user?.setPresence({ activities: [{ type: ActivityType.Watching, name }] });
}

async function handleSlashCommand(
  interaction: ChatInputCommandInteraction,
  config: AppConfig,
  logger: Logger,
  processManager: ProcessManager,
  api: SatisfactoryApi,
  commandProvider: CommandProvider,
  getCapabilities: () => Capabilities
): Promise<void> {
  if (interaction.commandName !== "satisfactory") return;
  const sub = interaction.options.getSubcommand();
  const adminCommands = new Set(["save", "start", "stop", "restart", "console"]);
  if (adminCommands.has(sub) && !isAdminInteraction(interaction, config)) {
    await interaction.reply({ content: "You are not authorised to run that command.", ephemeral: true });
    return;
  }

  if (sub === "status" || sub === "players") {
    const state = await api.queryServerState().catch(() => undefined);
    await interaction.reply({ embeds: [statusEmbed(processManager.snapshot(), state?.serverGameState?.numConnectedPlayers)] });
    return;
  }
  if (sub === "capabilities") {
    await interaction.reply({ embeds: [capabilitiesEmbed(getCapabilities())] });
    return;
  }
  if (sub === "help") {
    await interaction.reply("Commands: status, players, save, start, stop, restart, console, capabilities.");
    return;
  }
  if (sub === "save") {
    logger.info(`Discord admin ${interaction.user.tag} executed: save`);
    await api.saveGame();
    await interaction.reply("Save requested.");
    return;
  }
  if (sub === "start") {
    logger.info(`Discord admin ${interaction.user.tag} executed: start`);
    await processManager.start();
    await interaction.reply("Start requested.");
    return;
  }
  if (sub === "stop") {
    logger.info(`Discord admin ${interaction.user.tag} executed: stop`);
    await interaction.reply("Stop requested.");
    await processManager.stop();
    return;
  }
  if (sub === "restart") {
    logger.info(`Discord admin ${interaction.user.tag} executed: restart`);
    await interaction.reply("Restart requested.");
    await processManager.restart();
    return;
  }
  if (sub === "console") {
    const command = interaction.options.getString("command", true);
    logger.info(`Discord admin ${interaction.user.tag} executed console command: ${command}`);
    const result = await commandProvider.run(command);
    await interaction.reply(`Provider: ${result.provider}\nOutput:\n${result.output || "(no output)"}`.slice(0, 1900));
  }
}

async function handleDiscordMessage(message: Message, config: AppConfig, provider: GameMessageProvider): Promise<void> {
  if (message.author.bot || !config.relay.discordToGame || !provider.available) return;
  if (message.channelId !== config.discord.chatChannelId) return;
  const content = sanitiseGameMessage(message.member?.displayName ?? message.author.username, message.content);
  await provider.send(content);
}
