import { spawn } from "node:child_process";
export function launchServer(config) {
    return spawn(config.server.executable, config.server.args, {
        cwd: config.server.workingDirectory,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: false
    });
}
