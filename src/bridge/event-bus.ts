import { EventEmitter } from "node:events";

export interface GameChatMessage {
  timestamp: Date;
  playerName: string;
  message: string;
}

export type ServerEvent =
  | { type: "game-chat"; chat: GameChatMessage }
  | { type: "player-joined"; timestamp: Date; playerName: string }
  | { type: "player-left"; timestamp: Date; playerName: string }
  | { type: "server-started"; timestamp: Date; pid?: number }
  | { type: "server-ready"; timestamp: Date }
  | { type: "server-stopped"; timestamp: Date; code: number | null; signal: NodeJS.Signals | null }
  | { type: "server-crashed"; timestamp: Date; code: number | null; signal: NodeJS.Signals | null }
  | { type: "save-completed"; timestamp: Date; saveName?: string }
  | { type: "chat-moderation"; timestamp: Date; playerName: string; message: string; action: string; reasons: string[] }
  | { type: "admin-command"; timestamp: Date; playerName: string; command: string; outcome: string }
  | { type: "console"; timestamp: Date; level: "debug" | "info" | "warning" | "error"; line: string };

export class EventBus extends EventEmitter {
  publish(event: ServerEvent): void {
    this.emit("event", event);
    this.emit(event.type, event);
  }

  onEvent(listener: (event: ServerEvent) => void): () => void {
    this.on("event", listener);
    return () => this.off("event", listener);
  }
}
