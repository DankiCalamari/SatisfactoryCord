import { describe, expect, it } from "vitest";
import { RestartManager } from "../src/server/restart-manager.js";
describe("RestartManager", () => {
    it("blocks crash loops", () => {
        const manager = new RestartManager(2, 60, 1);
        expect(manager.recordCrash(1000).allowed).toBe(true);
        expect(manager.recordCrash(2000).allowed).toBe(true);
        expect(manager.recordCrash(3000).allowed).toBe(false);
    });
});
