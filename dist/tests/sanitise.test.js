import { describe, expect, it } from "vitest";
import { assertSafeConsoleCommand, sanitiseDiscordOutbound, sanitiseGameMessage } from "../src/utils/sanitise.js";
describe("sanitise", () => {
    it("prevents Discord mention abuse", () => {
        expect(sanitiseDiscordOutbound("@everyone hi")).toContain("@\u200beveryone");
    });
    it("prevents command separators in admin console commands", () => {
        expect(() => assertSafeConsoleCommand("help; quit")).toThrow(/unsafe/);
    });
    it("formats game messages on one line", () => {
        expect(sanitiseGameMessage("Ren", "I've got\n50 motors")).toBe("[Discord] Ren: I've got 50 motors");
    });
});
