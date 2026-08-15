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
      await this.call("QueryServerState", {});
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

  private async call<T>(functionName: string, data: Record<string, unknown>): Promise<T> {
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
      } as Record<string, string>
    } as RequestInit & { agent: https.Agent });
    if (!response.ok) throw new Error(`Satisfactory API ${functionName} failed with HTTP ${response.status}.`);
    const envelope = (await response.json()) as SatisfactoryApiResponse<T>;
    if (envelope.errorCode || envelope.errorMessage) {
      throw new Error(`${envelope.errorCode ?? "api_error"}: ${envelope.errorMessage ?? "unknown error"}`);
    }
    return (envelope.data ?? {}) as T;
  }
}
