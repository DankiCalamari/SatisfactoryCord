import type { EventBus, ServerEvent } from "./event-bus.js";
import { Deduplicator } from "./deduplication.js";

export class NormalisedRelay {
  private readonly dedupe = new Deduplicator();

  constructor(private readonly bus: EventBus, private readonly sink: (event: ServerEvent) => void | Promise<void>) {}

  start(): () => void {
    return this.bus.onEvent((event) => {
      if (!this.dedupe.accept(event)) return;
      void this.sink(event);
    });
  }
}
