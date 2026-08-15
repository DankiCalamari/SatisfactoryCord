import { spawn } from "node:child_process";
import type { AppConfig } from "../config.js";
import type { Logger } from "../utils/logger.js";

export async function runSteamCmd(config: AppConfig, logger: Logger, mode: "install" | "update" | "verify"): Promise<void> {
  const args = [
    "+force_install_dir",
    config.steamcmd.installDir,
    "+login",
    "anonymous",
    "+app_update",
    config.steamcmd.appId,
    ...(mode === "verify" ? ["validate"] : mode === "install" ? ["validate"] : []),
    "+quit"
  ];
  logger.info(`Running SteamCMD ${mode} for Satisfactory Dedicated Server app ${config.steamcmd.appId}.`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(config.steamcmd.path, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`SteamCMD exited with code ${code}.`))));
  });
}
