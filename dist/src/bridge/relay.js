import { Deduplicator } from "./deduplication.js";
export class NormalisedRelay {
    bus;
    sink;
    dedupe = new Deduplicator();
    constructor(bus, sink) {
        this.bus = bus;
        this.sink = sink;
    }
    start() {
        return this.bus.onEvent((event) => {
            if (!this.dedupe.accept(event))
                return;
            void this.sink(event);
        });
    }
}
