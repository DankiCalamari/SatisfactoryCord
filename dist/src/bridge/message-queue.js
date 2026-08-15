export class MessageQueue {
    chain = Promise.resolve();
    enqueue(work) {
        const next = this.chain.then(work, work);
        this.chain = next.then(() => undefined, () => undefined);
        return next;
    }
}
