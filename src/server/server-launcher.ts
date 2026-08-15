import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { AppConfig } from "../config.js";

export function launchServer(config: AppConfig): ChildProcessWithoutNullStreams {
  return spawn(config.server.executable, config.server.args, {
    cwd: config.server.workingDirectory,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: false
  });
}
