export function healthPayload(snapshot, discordConnected, capabilities) {
    return {
        status: snapshot.state === "CRASHED" ? "degraded" : "ok",
        server: {
            running: snapshot.state === "RUNNING",
            pid: snapshot.pid,
            uptime: snapshot.startedAt ? Math.floor((Date.now() - snapshot.startedAt.getTime()) / 1000) : 0
        },
        discord: { connected: discordConnected },
        satisfactory: {
            api: capabilities.httpsApi,
            log: capabilities.factoryGameLog,
            stdin: capabilities.stdin
        },
        relay: {
            gameToDiscord: capabilities.gameToDiscordChat,
            discordToGame: capabilities.discordToGameChat
        }
    };
}
