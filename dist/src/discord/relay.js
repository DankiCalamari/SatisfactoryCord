import { ChannelType } from "discord.js";
import { sanitiseDiscordOutbound } from "../utils/sanitise.js";
import { MessageQueue } from "../bridge/message-queue.js";
export class DiscordRelay {
    client;
    config;
    webhook;
    queue = new MessageQueue();
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }
    async handle(event) {
        if (!this.config.discord.enabled)
            return;
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
    }
    async sendEvent(message) {
        const channel = await this.eventsChannel();
        if (!channel)
            return;
        await channel.send({ content: sanitiseDiscordOutbound(message), allowedMentions: { parse: [] } });
    }
    async sendGameChat(playerName, message) {
        const channel = await this.chatChannel();
        if (!channel)
            return;
        const webhook = await this.getWebhook(channel);
        await webhook.send({
            username: sanitiseDiscordOutbound(playerName).slice(0, 80) || "Satisfactory",
            content: sanitiseDiscordOutbound(message).slice(0, 1900),
            allowedMentions: { parse: [] }
        });
    }
    async chatChannel() {
        const channel = await this.client.channels.fetch(this.config.discord.chatChannelId).catch(() => null);
        return channel?.type === ChannelType.GuildText ? channel : undefined;
    }
    async eventsChannel() {
        const id = this.config.discord.eventsChannelId || this.config.discord.chatChannelId;
        const channel = await this.client.channels.fetch(id).catch(() => null);
        return channel?.type === ChannelType.GuildText ? channel : undefined;
    }
    async getWebhook(channel) {
        if (this.webhook)
            return this.webhook;
        const hooks = await channel.fetchWebhooks();
        const existing = hooks.find((hook) => hook.name === "SatisfactoryCord" && hook.owner?.id === this.client.user?.id);
        this.webhook = existing ?? (await channel.createWebhook({ name: "SatisfactoryCord" }));
        return this.webhook;
    }
}
