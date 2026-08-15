const ansiPattern = new RegExp(String.raw`\u001b\[[0-?]*[ -/]*[@-~]`, "g");
// eslint-disable-next-line no-control-regex
const controlPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const mentionPattern = /@(everyone|here|[!&]?\d{16,22})/g;
const commandSeparatorPattern = /[;\r\n`|&<>]/;

export function stripAnsi(value: string): string {
  return value.replace(ansiPattern, "");
}

export function sanitiseLogText(value: string): string {
  return stripAnsi(value).replace(controlPattern, "").replace(/\r?\n/g, " ").trim();
}

export function sanitiseDiscordOutbound(value: string): string {
  return sanitiseLogText(value).replace(mentionPattern, "@\u200b$1");
}

export function sanitiseGameMessage(author: string, message: string, maxLength = 400): string {
  const safeAuthor = sanitiseLogText(author).replace(/[^\w .\-[\]()]/g, "").slice(0, 40).trim() || "Discord";
  const safeMessage = sanitiseLogText(message).replace(commandSeparatorPattern, " ").replace(/\s+/g, " ").trim();
  return `[Discord] ${safeAuthor}: ${safeMessage}`.slice(0, maxLength);
}

export function assertSafeConsoleCommand(command: string, maxLength = 200): string {
  const clean = sanitiseLogText(command);
  if (!clean || clean.length > maxLength) {
    throw new Error(`Console command must be between 1 and ${maxLength} characters.`);
  }
  if (commandSeparatorPattern.test(clean)) {
    throw new Error("Console command contains unsafe separators.");
  }
  return clean;
}
