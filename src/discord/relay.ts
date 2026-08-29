import { ChannelType, type Client, type TextChannel, type Webhook } from "discord.js";
import type { AppConfig } from "../config.js";
import type { ServerEvent } from "../bridge/event-bus.js";
import { sanitiseDiscordOutbound } from "../utils/sanitise.js";
import { MessageQueue } from "../bridge/message-queue.js";

export class DiscordRelay {
  private webhook?: Webhook;
  private readonly queue = new MessageQueue();

  constructor(private readonly client: Client, private readonly config: AppConfig) {}

  async handle(event: ServerEvent): Promise<void> {
    if (!this.config.discord.enabled) return;
    if (event.type === "game-chat" && this.config.relay.gameToDiscord) {
      await this.queue.enqueue(() => this.sendGameChat(event.chat.playerName, event.chat.message));
    }
    if (event.type === "player-joined" && this.config.relay.joins) {
      await this.sendEvent(`${event.playerName} joined the factory.`);
    }
    if (event.type === "player-left" && this.config.relay.joins) {
      await this.sendEvent(`${event.playerName} left the factory.`);
    }
    if (event.type === "server-crashed") {
      await this.sendEvent(`Satisfactory server crashed. Exit code: ${event.code ?? "unknown"}`);
    }
    if (event.type === "server-ready" && this.config.relay.serverStatus) {
      await this.sendEvent("Satisfactory server is ready.");
    }
    if (event.type === "admin-command") {
      await this.sendEvent(`Admin command: ${event.outcome}`);
    }
    if (event.type === "chat-moderation" && this.config.moderation.notifyDiscord) {
      await this.sendEvent(`Chat moderation ${event.action}: ${event.playerName} (${event.reasons.join(", ")})`);
    }
  }

  async sendEvent(message: string): Promise<void> {
    const channel = await this.eventsChannel();
    if (!channel) return;
    await channel.send({ content: sanitiseDiscordOutbound(message), allowedMentions: { parse: [] } });
  }

  private async sendGameChat(playerName: string, message: string): Promise<void> {
    const channel = await this.chatChannel();
    if (!channel) return;
    const webhook = await this.getWebhook(channel);
    await webhook.send({
      username: sanitiseDiscordOutbound(playerName).slice(0, 80) || "Satisfactory",
      content: sanitiseDiscordOutbound(message).slice(0, 1900),
      allowedMentions: { parse: [] }
    });
  }

  private async chatChannel(): Promise<TextChannel | undefined> {
    const channel = await this.client.channels.fetch(this.config.discord.chatChannelId).catch(() => null);
    return channel?.type === ChannelType.GuildText ? channel : undefined;
  }

  private async eventsChannel(): Promise<TextChannel | undefined> {
    const id = this.config.discord.eventsChannelId || this.config.discord.chatChannelId;
    const channel = await this.client.channels.fetch(id).catch(() => null);
    return channel?.type === ChannelType.GuildText ? channel : undefined;
  }

  private async getWebhook(channel: TextChannel): Promise<Webhook> {
    if (this.webhook) return this.webhook;
    const hooks = await channel.fetchWebhooks();
    const existing = hooks.find((hook) => hook.name === "SatisfactoryCord" && hook.owner?.id === this.client.user?.id);
    this.webhook = existing ?? (await channel.createWebhook({ name: "SatisfactoryCord" }));
    return this.webhook;
  }
}
