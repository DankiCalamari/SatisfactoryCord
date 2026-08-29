import type { AppConfig } from "../config.js";
import type { EventBus, ServerEvent } from "./event-bus.js";
import { ChatModerator } from "./chat-moderation.js";

export class GameChatFilter {
  private readonly moderator: ChatModerator;

  constructor(
    private readonly config: AppConfig,
    private readonly bus: EventBus,
    private readonly next: (event: ServerEvent) => void | Promise<void>
  ) {
    this.moderator = new ChatModerator(config);
  }

  async handle(event: ServerEvent): Promise<void> {
    if (event.type !== "game-chat") {
      await this.next(event);
      return;
    }

    if (
      this.config.inGameAdmin.enabled &&
      this.config.relay.hideInGameCommands &&
      event.chat.message.startsWith(this.config.inGameAdmin.prefix)
    ) {
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
