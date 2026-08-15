import { describe, expect, it } from "vitest";
import { Deduplicator } from "../src/bridge/deduplication.js";
describe("Deduplicator", () => {
    it("filters duplicate chat events", () => {
        const dedupe = new Deduplicator(1000);
        const event = {
            type: "game-chat",
            chat: { timestamp: new Date(), playerName: "Beau", message: "hello" }
        };
        expect(dedupe.accept(event)).toBe(true);
        expect(dedupe.accept(event)).toBe(false);
    });
});
