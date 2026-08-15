import { EventEmitter } from "node:events";
export class EventBus extends EventEmitter {
    publish(event) {
        this.emit("event", event);
        this.emit(event.type, event);
    }
    onEvent(listener) {
        this.on("event", listener);
        return () => this.off("event", listener);
    }
}
