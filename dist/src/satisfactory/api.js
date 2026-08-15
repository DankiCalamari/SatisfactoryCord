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
            await this.call("QueryServerState", {});
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
    async call(functionName, data) {
        const body = JSON.stringify({ function: functionName, data });
        const agent = new https.Agent({ rejectUnauthorized: this.config.satisfactoryApi.rejectUnauthorized });
        const response = await fetch(this.baseUrl, {
            method: "POST",
            body,
            agent,
            headers: {
                "content-type": "application/json",
                ...(this.config.satisfactoryApi.token
                    ? { authorization: `Bearer ${this.config.satisfactoryApi.token}` }
                    : {})
            }
        });
        if (!response.ok)
            throw new Error(`Satisfactory API ${functionName} failed with HTTP ${response.status}.`);
        const envelope = (await response.json());
        if (envelope.errorCode || envelope.errorMessage) {
            throw new Error(`${envelope.errorCode ?? "api_error"}: ${envelope.errorMessage ?? "unknown error"}`);
        }
        return (envelope.data ?? {});
    }
}
