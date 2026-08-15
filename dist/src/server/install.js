import { spawn } from "node:child_process";
export async function runSteamCmd(config, logger, mode) {
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
    await new Promise((resolve, reject) => {
        const child = spawn(config.steamcmd.path, args, { stdio: ["ignore", "pipe", "pipe"] });
        child.stdout.on("data", (chunk) => process.stdout.write(chunk));
        child.stderr.on("data", (chunk) => process.stderr.write(chunk));
        child.on("error", reject);
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`SteamCMD exited with code ${code}.`))));
    });
}
