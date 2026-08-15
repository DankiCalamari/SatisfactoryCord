import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { AppConfig } from "../config.js";

export function isAdminInteraction(interaction: ChatInputCommandInteraction, config: AppConfig): boolean {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (!config.discord.adminRoleId) return false;
  const member = interaction.member;
  if (!member || !("roles" in member)) return false;
  const roles = member.roles;
  if (Array.isArray(roles)) return roles.includes(config.discord.adminRoleId);
  return roles.cache.has(config.discord.adminRoleId);
}
