export type ServerState = "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "RESTARTING" | "CRASHED";

export interface LifecycleSnapshot {
  state: ServerState;
  pid?: number;
  startedAt?: Date;
  stoppedAt?: Date;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  restartCount: number;
}

export class Lifecycle {
  private snapshot: LifecycleSnapshot = { state: "STOPPED", restartCount: 0 };

  get(): LifecycleSnapshot {
    return { ...this.snapshot };
  }

  starting(): void {
    this.snapshot = { ...this.snapshot, state: "STARTING", exitCode: undefined, signal: undefined };
  }

  running(pid?: number): void {
    this.snapshot = { ...this.snapshot, state: "RUNNING", pid, startedAt: new Date(), stoppedAt: undefined };
  }

  stopping(): void {
    this.snapshot = { ...this.snapshot, state: "STOPPING" };
  }

  restarting(): void {
    this.snapshot = { ...this.snapshot, state: "RESTARTING" };
  }

  stopped(code: number | null, signal: NodeJS.Signals | null): void {
    this.snapshot = { ...this.snapshot, state: "STOPPED", pid: undefined, stoppedAt: new Date(), exitCode: code, signal };
  }

  crashed(code: number | null, signal: NodeJS.Signals | null): void {
    this.snapshot = { ...this.snapshot, state: "CRASHED", pid: undefined, stoppedAt: new Date(), exitCode: code, signal };
  }

  restarted(): void {
    this.snapshot = { ...this.snapshot, restartCount: this.snapshot.restartCount + 1 };
  }
}
