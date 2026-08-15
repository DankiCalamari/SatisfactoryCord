import { describe, expect, it } from "vitest";
import { StdoutParser } from "../src/server/stdout-parser.js";

describe("StdoutParser", () => {
  it("buffers partial lines", () => {
    const parser = new StdoutParser();
    expect(parser.push("[Chat] Beau: hel")).toHaveLength(0);
    const events = parser.push("lo\n");
    expect(events.some((event) => event.type === "game-chat")).toBe(true);
  });
});
