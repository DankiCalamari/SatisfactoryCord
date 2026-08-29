import { ChatModerator } from "./chat-moderation.js";
export class GameChatFilter {
    config;
    bus;
    next;
    moderator;
    constructor(config, bus, next) {
        this.config = config;
        this.bus = bus;
        this.next = next;
        this.moderator = new ChatModerator(config);
    }
    async handle(event) {
        if (event.type !== "game-chat") {
            await this.next(event);
            return;
        }
        if (this.config.inGameAdmin.enabled &&
            this.config.relay.hideInGameCommands &&
            event.chat.message.startsWith(this.config.inGameAdmin.prefix)) {
            return;
        }
        const decision = this.moderator.review(event.chat);
        if (decision.action === "allow") {
            await this.next({ ...event, chat: decision.chat });
            return;
        }
        this.bus.publish({
            type: "chat-moderation",
            timestamp: new Date(),
            playerName: decision.chat.playerName,
            message: decision.chat.message,
            action: decision.action,
            reasons: decision.reasons
        });
    }
}
