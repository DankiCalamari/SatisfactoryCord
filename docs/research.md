# SatisfactoryCord Research Notes

Date: 2026-08-15

SatisfactoryCord is intentionally vanilla. It does not use SML, Ficsit Remote Monitoring, DLL injection, packet manipulation, or modified game files.

## Current Public Findings

- SteamDB lists **Satisfactory Dedicated Server** as Steam app `1690800`, app type `Tool`, with Windows and Linux support.
- Current community-maintained server guidance indicates modern dedicated servers require port `7777` and, for current 1.1+ networking, `8888`; legacy `15000` and `15777` are documented by multiple sources as old Early Access/1.0-era ports and are not included in the default Docker Compose.
- Public mirrors of the official HTTPS API document `RunCommand`, `Shutdown`, `SaveGame`, and `QueryServerState` style operations. `RunCommand` runs a console command and returns command output, but the available command set is still server-version dependent.

Sources checked:

- SteamDB Satisfactory Dedicated Server app record: https://steamdb.info/app/1690800/info/
- Official API mirror: https://github.com/wolveix/satisfactory-server/wiki/Official-API-Docs
- Official wiki page search result for current ports/API: https://satisfactory.wiki.gg/wiki/Dedicated_servers and https://satisfactory.wiki.gg/wiki/Dedicated_servers/HTTPS_API

## stdin

The wrapper keeps `FactoryServer` stdin open and exposes `sendConsoleInput(command)`. This is mechanically testable because the wrapper is the parent process and uses `spawn(..., { stdio: ["pipe", "pipe", "pipe"] })`.

What is not yet safe to claim without a live server build:

- Which commands FactoryServer accepts from stdin.
- Whether stdin behavior matches the in-game Server Manager Console tab.
- Whether stdin accepts commands consistently on both Windows and Linux.

Runtime capability detection therefore marks stdin as available only when the pipe is writable, not as proof that any specific Satisfactory command works.

## HTTPS API RunCommand

The API client implements `RunCommand` as a separated provider. API health uses the unauthenticated `HealthCheck` function. At startup the wrapper attempts a non-destructive `help` command to detect whether `RunCommand` itself is usable with the configured token/server version.

Satisfactory's HTTPS API commonly uses a self-signed certificate. SatisfactoryCord uses Node's `https.request` so `SATISFACTORY_API_REJECT_UNAUTHORIZED=false` is applied directly to the TLS connection.

Important distinction:

- `RunCommand AVAILABLE` means the API accepted command execution.
- It does not mean arbitrary server-originated chat/broadcast is available.

## Game Chat In Logs

The log parser recognizes conservative candidate patterns for chat, joins, leaves, save completion, readiness, warnings, and errors. These patterns are intentionally narrow. Unknown Unreal Engine logs remain console events and are not relayed as chat.

Live validation still needed per server version:

- Whether player chat appears in stdout.
- Whether player chat appears in `FactoryGame.log`.
- Whether both sources duplicate the same line.

The event bus includes deduplication so duplicate stdout/log events are suppressed.

## Discord To Game

No verified vanilla Satisfactory server-originated arbitrary chat/broadcast command was found during this build. Because of that, Discord-to-game relay is architecturally supported but disabled by default.

If an administrator verifies a vanilla command for their exact server version, they may set:

```env
SATISFACTORY_VERIFIED_BROADCAST_COMMAND=<command>
```

SatisfactoryCord will still sanitize and single-argument encode text before sending it. If the message cannot be safely encoded, it is rejected.

## In-Game Wrapper/Admin Commands

SatisfactoryCord can parse commands from game chat when chat lines are visible through stdout or `FactoryGame.log`.

Example:

```text
!sc status
!sc save
!sc restart
```

This remains vanilla because SatisfactoryCord only reads normal server output/logs and then uses the already implemented wrapper/API/control paths. It does not inject mods into the game.

Security note: vanilla chat/log parsing may expose a display name, not a cryptographically verified account identity. `IN_GAME_ADMIN_PLAYERS` is therefore a name allowlist and should be used on trusted/private servers. Keep `IN_GAME_ADMIN_ALLOW_CONSOLE=false` unless you have a specific operational need.

## Chat Moderation

Chat moderation runs before game chat is relayed to Discord. It can block:

- terms from `config/blocked-words.txt`
- configured terms
- configured regular expression patterns
- Discord mention abuse
- overlong messages
- repeated-character spam

It does not delete or alter the original message inside the live Satisfactory server. Without mods, the wrapper cannot rewrite the game's internal chat stream.

## Probe Utility

`npm run probe` performs non-destructive capability checks:

- stdout capture status
- stdin pipe writability
- HTTPS API health
- RunCommand health
- chat output remains `UNKNOWN` without observed live input
- broadcast remains `UNSUPPORTED` unless explicitly verified
