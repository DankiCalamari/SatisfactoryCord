import https from "node:https";
export class SatisfactoryApi {
    config;
    logger;
    baseUrl;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.baseUrl = `https://${config.satisfactoryApi.host}:${config.satisfactoryApi.port}/api/v1`;
    }
    async health() {
        try {
            await this.call("HealthCheck", { ClientCustomData: "" }, false);
            return true;
        }
        catch (error) {
            this.logger.debug("HTTPS API health check failed.", { error: error instanceof Error ? error.message : error });
            return false;
        }
    }
    async queryServerState() {
        return this.call("QueryServerState", {});
    }
    async runCommand(command) {
        const response = await this.call("RunCommand", { Command: command });
        return response.CommandResult ?? "";
    }
    async saveGame() {
        await this.call("SaveGame", {});
    }
    async shutdown() {
        await this.call("Shutdown", {});
    }
    async call(functionName, data, includeAuth = true) {
        const body = JSON.stringify({ function: functionName, data });
        const url = new URL(this.baseUrl);
        const raw = await new Promise((resolve, reject) => {
            const request = https.request({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: "POST",
                rejectUnauthorized: this.config.satisfactoryApi.rejectUnauthorized,
                headers: {
                    "content-type": "application/json",
                    "content-length": Buffer.byteLength(body),
                    ...(includeAuth && this.config.satisfactoryApi.token
                        ? { authorization: `Bearer ${this.config.satisfactoryApi.token}` }
                        : {})
                }
            }, (response) => {
                let responseBody = "";
                response.setEncoding("utf8");
                response.on("data", (chunk) => {
                    responseBody += chunk;
                });
                response.on("end", () => {
                    if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
                        reject(new Error(`Satisfactory API ${functionName} failed with HTTP ${response.statusCode}.`));
                        return;
                    }
                    resolve(responseBody);
                });
            });
            request.on("error", reject);
            request.setTimeout(10_000, () => {
                request.destroy(new Error(`Satisfactory API ${functionName} timed out.`));
            });
            request.write(body);
            request.end();
        });
        const envelope = JSON.parse(raw || "{}");
        if (envelope.errorCode || envelope.errorMessage) {
            throw new Error(`${envelope.errorCode ?? "api_error"}: ${envelope.errorMessage ?? "unknown error"}`);
        }
        return (envelope.data ?? {});
    }
}
