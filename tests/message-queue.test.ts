import { describe, expect, it } from "vitest";
import { MessageQueue } from "../src/bridge/message-queue.js";

describe("MessageQueue", () => {
  it("runs jobs in order", async () => {
    const queue = new MessageQueue();
    const seen: number[] = [];
    await Promise.all([
      queue.enqueue(async () => {
        seen.push(1);
      }),
      queue.enqueue(async () => {
        seen.push(2);
      })
    ]);
    expect(seen).toEqual([1, 2]);
  });
});
