import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
export function commandDefinitions() {
    return [
        new SlashCommandBuilder()
            .setName("satisfactory")
            .setDescription("Manage SatisfactoryCord")
            .addSubcommand((s) => s.setName("status").setDescription("Show server status"))
            .addSubcommand((s) => s.setName("players").setDescription("Show connected players"))
            .addSubcommand((s) => s.setName("save").setDescription("Request a server save"))
            .addSubcommand((s) => s.setName("start").setDescription("Start FactoryServer"))
            .addSubcommand((s) => s.setName("stop").setDescription("Stop FactoryServer"))
            .addSubcommand((s) => s.setName("restart").setDescription("Restart FactoryServer"))
            .addSubcommand((s) => s
            .setName("console")
            .setDescription("Run an authorised server console command")
            .addStringOption((o) => o.setName("command").setDescription("Command").setRequired(true)))
            .addSubcommand((s) => s.setName("capabilities").setDescription("Show detected capabilities"))
            .addSubcommand((s) => s.setName("help").setDescription("Show SatisfactoryCord help"))
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
            .toJSON()
    ];
}
export async function registerDiscordCommands(config, clientId) {
    if (!config.discord.enabled || !config.discord.token || !config.discord.guildId)
        return;
    const rest = new REST({ version: "10" }).setToken(config.discord.token);
    await rest.put(Routes.applicationGuildCommands(clientId, config.discord.guildId), { body: commandDefinitions() });
}
