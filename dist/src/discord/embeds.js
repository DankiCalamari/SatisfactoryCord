import { EmbedBuilder } from "discord.js";
import { formatDuration } from "../utils/platform.js";
export function statusEmbed(snapshot, players) {
    const uptime = snapshot.startedAt ? formatDuration((Date.now() - snapshot.startedAt.getTime()) / 1000) : "offline";
    return new EmbedBuilder()
        .setTitle("SatisfactoryCord Status")
        .setColor(snapshot.state === "RUNNING" ? 0x27ae60 : snapshot.state === "CRASHED" ? 0xc0392b : 0xf39c12)
        .addFields({ name: "Server", value: snapshot.state, inline: true }, { name: "PID", value: snapshot.pid ? String(snapshot.pid) : "none", inline: true }, { name: "Uptime", value: uptime, inline: true }, { name: "Players", value: players === undefined ? "unknown" : String(players), inline: true }, { name: "Restarts", value: String(snapshot.restartCount), inline: true });
}
export function capabilitiesEmbed(capabilities) {
    const mark = (value) => (value ? "yes" : "no");
    return new EmbedBuilder()
        .setTitle("SatisfactoryCord Capabilities")
        .setColor(0x3498db)
        .setDescription([
        `Process Control: ${mark(capabilities.processControl)}`,
        `stdout Capture: ${mark(capabilities.stdoutCapture)}`,
        `stdin Control: ${mark(capabilities.stdin)}`,
        `FactoryGame.log: ${mark(capabilities.factoryGameLog)}`,
        `HTTPS API: ${mark(capabilities.httpsApi)}`,
        `RunCommand: ${mark(capabilities.runCommand)}`,
        `Game -> Discord Chat: ${mark(capabilities.gameToDiscordChat)}`,
        `Discord -> Game Chat: ${mark(capabilities.discordToGameChat)}`,
        "",
        capabilities.discordToGameChat
            ? "Discord-to-game relay is backed by a detected vanilla provider."
            : "Vanilla Satisfactory has no verified arbitrary broadcast provider enabled."
    ].join("\n"));
}
