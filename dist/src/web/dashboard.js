import { formatDuration } from "../utils/platform.js";
export function dashboardHtml(snapshot, discordConnected, capabilities) {
    const uptime = snapshot.startedAt ? formatDuration((Date.now() - snapshot.startedAt.getTime()) / 1000) : "0s";
    const dot = (ok) => `<span class="${ok ? "ok" : "bad"}">${ok ? "Online" : "Unavailable"}</span>`;
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SatisfactoryCord</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, Segoe UI, Arial, sans-serif; background: #101416; color: #edf2f4; }
    body { margin: 0; padding: 32px; }
    main { max-width: 880px; margin: 0 auto; }
    h1 { font-size: 32px; margin: 0 0 24px; }
    table { width: 100%; border-collapse: collapse; background: #171d20; border: 1px solid #2d383d; }
    th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #2d383d; }
    th { color: #9fb0b7; font-weight: 600; width: 38%; }
    .ok { color: #55d07a; font-weight: 700; }
    .bad { color: #ff6961; font-weight: 700; }
  </style>
</head>
<body>
<main>
  <h1>SatisfactoryCord</h1>
  <table>
    <tr><th>Server</th><td>${snapshot.state}</td></tr>
    <tr><th>PID</th><td>${snapshot.pid ?? "none"}</td></tr>
    <tr><th>Uptime</th><td>${uptime}</td></tr>
    <tr><th>Discord</th><td>${dot(discordConnected)}</td></tr>
    <tr><th>HTTPS API</th><td>${dot(capabilities.httpsApi)}</td></tr>
    <tr><th>FactoryGame.log</th><td>${dot(capabilities.factoryGameLog)}</td></tr>
    <tr><th>stdin</th><td>${dot(capabilities.stdin)}</td></tr>
    <tr><th>Game -> Discord</th><td>${dot(capabilities.gameToDiscordChat)}</td></tr>
    <tr><th>Discord -> Game</th><td>${dot(capabilities.discordToGameChat)}</td></tr>
    <tr><th>Restarts</th><td>${snapshot.restartCount}</td></tr>
  </table>
</main>
</body>
</html>`;
}
