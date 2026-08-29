# SatisfactoryCord

SatisfactoryCord is a vanilla Satisfactory Dedicated Server wrapper and Discord bridge.

It does not modify Satisfactory. Instead, it launches `FactoryServer` as a child process and acts as a process supervisor around it. That gives SatisfactoryCord access to the server's stdin, stdout, stderr, process state, logs, and official HTTPS API while the game server remains completely vanilla.

No SML, no FRM, no modified game files, no client changes.

## Features

- Launches and supervises `FactoryServer` with `child_process.spawn()`
- Captures stdout/stderr and preserves console output
- Keeps stdin writable for investigation and supported console commands
- Watches `FactoryGame.log` without rereading the whole file
- Uses the vanilla HTTPS API and `RunCommand` when available
- Relays supported game chat/events to Discord
- Moderates game chat before Discord relay
- Supports wrapper/admin commands from in-game chat for allowlisted player names
- Provides Discord slash commands and local terminal commands
- Exposes a simple dashboard and `GET /health`
- Supports Linux, Windows, Docker, and existing server installs

## Install

```bash
npm install
cp .env.example .env
npm run build
npm start
```

For an existing server, set:

```env
SATISFACTORY_EXECUTABLE=/existing/server/FactoryServer.sh
SATISFACTORY_WORKING_DIRECTORY=/existing/server
SATISFACTORY_LOG_PATH=/existing/server/FactoryGame/Saved/Logs/FactoryGame.log
```

On Windows:

```env
SATISFACTORY_EXECUTABLE=C:\SatisfactoryDedicatedServer\FactoryServer.exe
SATISFACTORY_WORKING_DIRECTORY=C:\SatisfactoryDedicatedServer
SATISFACTORY_LOG_PATH=C:\SatisfactoryDedicatedServer\FactoryGame\Saved\Logs\FactoryGame.log
```

## Discord

Set:

```env
DISCORD_ENABLED=true
DISCORD_TOKEN=
DISCORD_GUILD_ID=
DISCORD_CHAT_CHANNEL_ID=
DISCORD_EVENTS_CHANNEL_ID=
DISCORD_ADMIN_ROLE_ID=
```

Admin commands require either the configured role or Discord Administrator permission.

For game-to-Discord chat, give the bot `Manage Webhooks` in the chat channel if you want relayed messages to use the in-game player name as the Discord sender name. If webhook access is missing or Discord rejects the webhook, SatisfactoryCord falls back to a normal bot message and logs the reason.

## Commands

Local terminal:

```text
help
status
players
save
restart
stop
start
discord
console <command>
quit
```

Discord:

```text
/satisfactory status
/satisfactory players
/satisfactory save
/satisfactory start
/satisfactory stop
/satisfactory restart
/satisfactory console
/satisfactory capabilities
/satisfactory help
```

In-game chat commands, when enabled:

```text
!sc help
!sc status
!sc players
!sc save
!sc restart
!sc stop
!sc start
!sc capabilities
!sc console <command>
```

Enable them with:

```env
IN_GAME_ADMIN_ENABLED=true
IN_GAME_ADMIN_PREFIX=!sc
IN_GAME_ADMIN_PLAYERS=Beau,Ren
IN_GAME_ADMIN_ALLOW_CONSOLE=false
```

In-game admin authorisation uses the player name parsed from vanilla server chat/log output. Treat this as suitable for trusted/private servers, not as identity-grade authentication for public servers.

## Chat Moderation

SatisfactoryCord can block selected game chat before it is relayed to Discord:

```env
CHAT_MODERATION_ENABLED=true
CHAT_BLOCKED_WORDS_FILE=config/blocked-words.txt
CHAT_BLOCKED_TERMS=term1,term2
CHAT_BLOCKED_PATTERNS=
CHAT_MAX_MESSAGE_LENGTH=500
CHAT_MAX_REPEATED_CHARACTERS=12
CHAT_BLOCK_DISCORD_MENTIONS=true
CHAT_MODERATION_NOTIFY_DISCORD=true
RELAY_HIDE_IN_GAME_COMMANDS=true
```

Moderation blocks Discord mention abuse, overlong messages, repeated-character spam, configured terms, terms from `config/blocked-words.txt`, and configured regular expressions before messages are relayed to Discord. It does not filter, delete, or alter chat inside Satisfactory because SatisfactoryCord remains an external wrapper.

## Docker

```bash
docker compose up --build
```

The compose file exposes current expected ports:

- `7777/tcp`
- `7777/udp`
- `8888/tcp`
- `3000/tcp`

Saves and server files should live in mounted volumes, not the disposable container layer.

## SteamCMD

Satisfactory Dedicated Server app ID: `1690800`.

```bash
npx satisfactorycord install
npx satisfactorycord update
npx satisfactorycord verify
```

Do not update a running server. The safe sequence is save, shutdown, SteamCMD update, start.

## Vanilla Limitations

Game-to-Discord chat is implemented from stdout/log parsing when the server version emits reliable chat lines.

If your vanilla dedicated server does not write player chat to stdout or `FactoryGame.log`, use the server-side scaffold in `server-plugin/SatisfactoryCordChatTap`. It writes a dedicated `SatisfactoryCordChatTap: [SC_CHAT] ...` log line that the wrapper parses. Satisfactory does not have a vanilla drop-in plugin system, so this must be built through the SML/Alpakit dedicated-server toolchain.

Discord-to-game chat is disabled by default because no verified vanilla command for arbitrary broadcast/chat text was confirmed during this build. If a future or specific server version exposes a safe vanilla command, configure:

```env
SATISFACTORY_VERIFIED_BROADCAST_COMMAND=
```

SatisfactoryCord will still reject unsafe characters, newlines, command separators, ANSI escapes, and overlong messages.

## Health

```text
GET http://localhost:3000/health
```

## Testing Without Discord

```env
DISCORD_ENABLED=false
```

Then run `npm start` to use SatisfactoryCord purely as a FactoryServer wrapper.

## Research

See [docs/research.md](docs/research.md) for the current stdin, RunCommand, chat-log, and broadcast findings.
