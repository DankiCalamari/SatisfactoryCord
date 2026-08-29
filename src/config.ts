import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import YAML from "yaml";
import { z } from "zod";
import { splitArgs } from "./utils/platform.js";

dotenv.config();

const configSchema = z.object({
  server: z.object({
    executable: z.string().min(1),
    args: z.array(z.string()),
    workingDirectory: z.string().min(1),
    logPath: z.string().optional(),
    autoRestart: z.boolean(),
    autoRestartDelay: z.number().int().min(0),
    maxCrashRestarts: z.number().int().min(0),
    crashRestartWindow: z.number().int().min(1)
  }),
  satisfactoryApi: z.object({
    host: z.string(),
    port: z.number().int().min(1),
    token: z.string(),
    rejectUnauthorized: z.boolean()
  }),
  discord: z.object({
    enabled: z.boolean(),
    token: z.string(),
    guildId: z.string(),
    chatChannelId: z.string(),
    eventsChannelId: z.string(),
    consoleChannelId: z.string(),
    consoleLevel: z.enum(["error", "warning", "info", "debug"]),
    adminRoleId: z.string()
  }),
  relay: z.object({
    gameToDiscord: z.boolean(),
    discordToGame: z.boolean(),
    joins: z.boolean(),
    serverStatus: z.boolean(),
    hideInGameCommands: z.boolean()
  }),
  moderation: z.object({
    enabled: z.boolean(),
    blockedWordsFile: z.string(),
    blockedTerms: z.array(z.string()),
    blockedPatterns: z.array(z.string()),
    maxMessageLength: z.number().int().min(1),
    maxRepeatedCharacters: z.number().int().min(0),
    blockDiscordMentions: z.boolean(),
    notifyDiscord: z.boolean()
  }),
  inGameAdmin: z.object({
    enabled: z.boolean(),
    prefix: z.string().min(1),
    adminPlayers: z.array(z.string()),
    allowConsole: z.boolean(),
    requireExactNameMatch: z.boolean()
  }),
  web: z.object({
    host: z.string(),
    port: z.number().int().min(1)
  }),
  logging: z.object({
    level: z.enum(["debug", "info", "warning", "error"]),
    logDir: z.string(),
    serverConsoleLog: z.string()
  }),
  steamcmd: z.object({
    path: z.string(),
    installDir: z.string(),
    appId: z.string()
  }),
  backup: z.object({
    retention: z.number().int().min(0)
  })
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(configPath = "config.yml"): AppConfig {
  const fileConfig = readConfigFile(configPath);
  const cfg = {
    server: {
      executable: env("SATISFACTORY_EXECUTABLE", fileConfig.server?.executable ?? defaultExecutable()),
      args: splitArgs(env("SATISFACTORY_ARGS", fileConfig.server?.args)),
      workingDirectory: env("SATISFACTORY_WORKING_DIRECTORY", fileConfig.server?.workingDirectory ?? process.cwd()),
      logPath: optionalEnv("SATISFACTORY_LOG_PATH", fileConfig.server?.logPath),
      autoRestart: boolEnv("AUTO_RESTART", fileConfig.server?.autoRestart ?? true),
      autoRestartDelay: intEnv("AUTO_RESTART_DELAY", fileConfig.server?.autoRestartDelay ?? 10),
      maxCrashRestarts: intEnv("MAX_CRASH_RESTARTS", fileConfig.server?.maxCrashRestarts ?? 5),
      crashRestartWindow: intEnv("CRASH_RESTART_WINDOW", fileConfig.server?.crashRestartWindow ?? 600)
    },
    satisfactoryApi: {
      host: env("SATISFACTORY_API_HOST", fileConfig.satisfactoryApi?.host ?? "127.0.0.1"),
      port: intEnv("SATISFACTORY_API_PORT", fileConfig.satisfactoryApi?.port ?? 7777),
      token: env("SATISFACTORY_API_TOKEN", fileConfig.satisfactoryApi?.token ?? ""),
      rejectUnauthorized: boolEnv(
        "SATISFACTORY_API_REJECT_UNAUTHORIZED",
        fileConfig.satisfactoryApi?.rejectUnauthorized ?? false
      )
    },
    discord: {
      enabled: boolEnv("DISCORD_ENABLED", fileConfig.discord?.enabled ?? true),
      token: env("DISCORD_TOKEN", ""),
      guildId: env("DISCORD_GUILD_ID", fileConfig.discord?.guildId ?? ""),
      chatChannelId: env("DISCORD_CHAT_CHANNEL_ID", fileConfig.discord?.chatChannelId ?? ""),
      eventsChannelId: env("DISCORD_EVENTS_CHANNEL_ID", fileConfig.discord?.eventsChannelId ?? ""),
      consoleChannelId: env("DISCORD_CONSOLE_CHANNEL_ID", fileConfig.discord?.consoleChannelId ?? ""),
      consoleLevel: env("DISCORD_CONSOLE_LEVEL", fileConfig.discord?.consoleLevel ?? "warning"),
      adminRoleId: env("DISCORD_ADMIN_ROLE_ID", fileConfig.discord?.adminRoleId ?? "")
    },
    relay: {
      gameToDiscord: boolEnv("RELAY_GAME_TO_DISCORD", fileConfig.relay?.gameToDiscord ?? true),
      discordToGame: boolEnv("RELAY_DISCORD_TO_GAME", fileConfig.relay?.discordToGame ?? true),
      joins: boolEnv("RELAY_JOINS", fileConfig.relay?.joins ?? true),
      serverStatus: boolEnv("RELAY_SERVER_STATUS", fileConfig.relay?.serverStatus ?? true),
      hideInGameCommands: boolEnv("RELAY_HIDE_IN_GAME_COMMANDS", fileConfig.relay?.hideInGameCommands ?? true)
    },
    moderation: {
      enabled: boolEnv("CHAT_MODERATION_ENABLED", fileConfig.moderation?.enabled ?? false),
      blockedWordsFile: env(
        "CHAT_BLOCKED_WORDS_FILE",
        fileConfig.moderation?.blockedWordsFile ?? "config/blocked-words.txt"
      ),
      blockedTerms: listEnv("CHAT_BLOCKED_TERMS", fileConfig.moderation?.blockedTerms ?? []),
      blockedPatterns: listEnv("CHAT_BLOCKED_PATTERNS", fileConfig.moderation?.blockedPatterns ?? []),
      maxMessageLength: intEnv("CHAT_MAX_MESSAGE_LENGTH", fileConfig.moderation?.maxMessageLength ?? 500),
      maxRepeatedCharacters: intEnv("CHAT_MAX_REPEATED_CHARACTERS", fileConfig.moderation?.maxRepeatedCharacters ?? 12),
      blockDiscordMentions: boolEnv("CHAT_BLOCK_DISCORD_MENTIONS", fileConfig.moderation?.blockDiscordMentions ?? true),
      notifyDiscord: boolEnv("CHAT_MODERATION_NOTIFY_DISCORD", fileConfig.moderation?.notifyDiscord ?? true)
    },
    inGameAdmin: {
      enabled: boolEnv("IN_GAME_ADMIN_ENABLED", fileConfig.inGameAdmin?.enabled ?? false),
      prefix: env("IN_GAME_ADMIN_PREFIX", fileConfig.inGameAdmin?.prefix ?? "!sc"),
      adminPlayers: listEnv("IN_GAME_ADMIN_PLAYERS", fileConfig.inGameAdmin?.adminPlayers ?? []),
      allowConsole: boolEnv("IN_GAME_ADMIN_ALLOW_CONSOLE", fileConfig.inGameAdmin?.allowConsole ?? false),
      requireExactNameMatch: boolEnv(
        "IN_GAME_ADMIN_REQUIRE_EXACT_NAME_MATCH",
        fileConfig.inGameAdmin?.requireExactNameMatch ?? true
      )
    },
    web: {
      host: env("WEB_HOST", fileConfig.web?.host ?? "0.0.0.0"),
      port: intEnv("WEB_PORT", fileConfig.web?.port ?? 3000)
    },
    logging: {
      level: env("LOG_LEVEL", fileConfig.logging?.level ?? "info"),
      logDir: env("LOG_DIR", fileConfig.logging?.logDir ?? "logs"),
      serverConsoleLog: env("SERVER_CONSOLE_LOG", fileConfig.logging?.serverConsoleLog ?? "logs/server-console.log")
    },
    steamcmd: {
      path: env("STEAMCMD_PATH", fileConfig.steamcmd?.path ?? "/usr/games/steamcmd"),
      installDir: env("SATISFACTORY_INSTALL_DIR", fileConfig.steamcmd?.installDir ?? "/opt/satisfactory"),
      appId: env("SATISFACTORY_STEAM_APP_ID", fileConfig.steamcmd?.appId ?? "1690800")
    },
    backup: {
      retention: intEnv("BACKUP_RETENTION", fileConfig.backup?.retention ?? 10)
    }
  };
  return configSchema.parse(cfg);
}

function readConfigFile(configPath: string): any {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) return {};
  return YAML.parse(fs.readFileSync(resolved, "utf8")) ?? {};
}

function env<T>(name: string, fallback: T): T {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value as T;
}

function optionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

function listEnv(name: string, fallback: string[]): string[] {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function defaultExecutable(): string {
  return process.platform === "win32"
    ? "C:\\SatisfactoryDedicatedServer\\FactoryServer.exe"
    : "/opt/satisfactory/FactoryServer.sh";
}
