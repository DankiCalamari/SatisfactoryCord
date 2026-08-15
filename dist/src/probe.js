import { loadConfig } from "./config.js";
import { Logger } from "./utils/logger.js";
import { EventBus } from "./bridge/event-bus.js";
import { ProcessManager } from "./server/process-manager.js";
import { SatisfactoryApi } from "./satisfactory/api.js";
import { ApiRunCommandProvider, StdinCommandProvider } from "./satisfactory/commands.js";
async function main() {
    const config = loadConfig();
    const logger = new Logger(config.logging.level, config.logging.logDir);
    const bus = new EventBus();
    const manager = new ProcessManager(config, bus, logger);
    const api = new SatisfactoryApi(config, logger);
    const stdinProvider = new StdinCommandProvider(manager.stdin);
    const apiProvider = new ApiRunCommandProvider(api);
    await apiProvider.detect();
    const checks = [
        ["stdout", Boolean(manager.process?.stdout)],
        ["stdin writable", stdinProvider.available],
        ["API", await api.health()],
        ["RunCommand", apiProvider.available],
        ["chat output", "UNKNOWN"],
        ["broadcast", "UNSUPPORTED"]
    ];
    for (const [name, value] of checks) {
        console.log(`Checking ${String(name).padEnd(22, ".")} ${value === true ? "YES" : value === false ? "NO" : value}`);
    }
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
