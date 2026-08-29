import https from "node:https";
import type { AppConfig } from "../config.js";
import type { Logger } from "../utils/logger.js";
import type { SatisfactoryApiResponse, ServerStateResponse } from "./api-types.js";

export class SatisfactoryApi {
  private readonly baseUrl: string;

  constructor(private readonly config: AppConfig, private readonly logger: Logger) {
    this.baseUrl = `https://${config.satisfactoryApi.host}:${config.satisfactoryApi.port}/api/v1`;
  }

  async health(): Promise<boolean> {
    try {
      await this.call("HealthCheck", { ClientCustomData: "" }, false);
      return true;
    } catch (error) {
      this.logger.debug("HTTPS API health check failed.", { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  async queryServerState(): Promise<ServerStateResponse> {
    return this.call<ServerStateResponse>("QueryServerState", {});
  }

  async runCommand(command: string): Promise<string> {
    const response = await this.call<{ CommandResult?: string }>("RunCommand", { Command: command });
    return response.CommandResult ?? "";
  }

  async saveGame(): Promise<void> {
    await this.call("SaveGame", {});
  }

  async shutdown(): Promise<void> {
    await this.call("Shutdown", {});
  }

  private async call<T>(functionName: string, data: Record<string, unknown>, includeAuth = true): Promise<T> {
    const body = JSON.stringify({ function: functionName, data });
    const url = new URL(this.baseUrl);
    const raw = await new Promise<string>((resolve, reject) => {
      const request = https.request(
        {
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
        },
        (response) => {
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
        }
      );
      request.on("error", reject);
      request.setTimeout(10_000, () => {
        request.destroy(new Error(`Satisfactory API ${functionName} timed out.`));
      });
      request.write(body);
      request.end();
    });
    const envelope = JSON.parse(raw || "{}") as SatisfactoryApiResponse<T>;
    if (envelope.errorCode || envelope.errorMessage) {
      throw new Error(`${envelope.errorCode ?? "api_error"}: ${envelope.errorMessage ?? "unknown error"}`);
    }
    return (envelope.data ?? {}) as T;
  }
}
