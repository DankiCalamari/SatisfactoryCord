import { describe, expect, it } from "vitest";
import { parseLogLine } from "../src/server/log-parser.js";

describe("parseLogLine", () => {
  it("parses conservative chat candidates", () => {
    const events = parseLogLine("[2026.08.15] [Chat] Beau: anyone got spare motors?");
    const chat = events.find((event) => event.type === "game-chat");
    expect(chat).toMatchObject({
      type: "game-chat",
      chat: { playerName: "Beau", message: "anyone got spare motors?" }
    });
  });

  it("does not treat arbitrary log noise as chat", () => {
    const events = parseLogLine("LogNet: Browse: 127.0.0.1/Game/FactoryGame");
    expect(events.some((event) => event.type === "game-chat")).toBe(false);
  });

  it("detects save completion", () => {
    const events = parseLogLine("LogSave: Save completed successfully");
    expect(events.some((event) => event.type === "save-completed")).toBe(true);
  });
});
