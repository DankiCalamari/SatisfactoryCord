import fs from "node:fs";
export async function detectCapabilities(config, processManager, api, commandProvider, messageProvider) {
    const httpsApi = await api.health();
    return {
        processControl: Boolean(processManager.snapshot().pid),
        stdoutCapture: Boolean(processManager.process?.stdout),
        stdin: processManager.stdin.available,
        factoryGameLog: Boolean(config.server.logPath && fs.existsSync(config.server.logPath)),
        httpsApi,
        runCommand: commandProvider.name === "HTTPS API RunCommand" && commandProvider.available,
        gameToDiscordChat: true,
        discordToGameChat: messageProvider.available
    };
}
export function formatCapabilities(capabilities) {
    const row = (name, available) => `${name.padEnd(24)} ${available ? "AVAILABLE" : "UNSUPPORTED"}`;
    return [
        "SatisfactoryCord capabilities",
        "",
        row("Process Control", capabilities.processControl),
        row("stdout Capture", capabilities.stdoutCapture),
        row("stdin Control", capabilities.stdin),
        row("FactoryGame.log", capabilities.factoryGameLog),
        row("HTTPS API", capabilities.httpsApi),
        row("RunCommand", capabilities.runCommand),
        row("Game -> Discord chat", capabilities.gameToDiscordChat),
        row("Discord -> Game chat", capabilities.discordToGameChat)
    ].join("\n");
}
