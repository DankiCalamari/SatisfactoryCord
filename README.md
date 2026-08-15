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
```

On Windows:

```env
SATISFACTORY_EXECUTABLE=C:\SatisfactoryDedicatedServer\FactoryServer.exe
SATISFACTORY_WORKING_DIRECTORY=C:\SatisfactoryDedicatedServer
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
