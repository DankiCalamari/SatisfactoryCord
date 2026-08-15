export class Lifecycle {
    snapshot = { state: "STOPPED", restartCount: 0 };
    get() {
        return { ...this.snapshot };
    }
    starting() {
        this.snapshot = { ...this.snapshot, state: "STARTING", exitCode: undefined, signal: undefined };
    }
    running(pid) {
        this.snapshot = { ...this.snapshot, state: "RUNNING", pid, startedAt: new Date(), stoppedAt: undefined };
    }
    stopping() {
        this.snapshot = { ...this.snapshot, state: "STOPPING" };
    }
    restarting() {
        this.snapshot = { ...this.snapshot, state: "RESTARTING" };
    }
    stopped(code, signal) {
        this.snapshot = { ...this.snapshot, state: "STOPPED", pid: undefined, stoppedAt: new Date(), exitCode: code, signal };
    }
    crashed(code, signal) {
        this.snapshot = { ...this.snapshot, state: "CRASHED", pid: undefined, stoppedAt: new Date(), exitCode: code, signal };
    }
    restarted() {
        this.snapshot = { ...this.snapshot, restartCount: this.snapshot.restartCount + 1 };
    }
}
