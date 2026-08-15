import http from "node:http";
import { dashboardHtml } from "./dashboard.js";
import { healthPayload } from "./health.js";
export function startWebServer(config, processManager, discordConnected, capabilities) {
    const server = http.createServer((req, res) => {
        if (req.url === "/health") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify(healthPayload(processManager.snapshot(), discordConnected(), capabilities()), null, 2));
            return;
        }
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(dashboardHtml(processManager.snapshot(), discordConnected(), capabilities()));
    });
    server.listen(config.web.port, config.web.host);
    return server;
}
