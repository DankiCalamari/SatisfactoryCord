# SatisfactoryCordChatTap

SatisfactoryCordChatTap is the server-side Satisfactory plugin scaffold for SatisfactoryCord.

Its only job is to write player chat to the dedicated server log in a stable format that the Node wrapper can parse:

```text
SatisfactoryCordChatTap: [SC_CHAT] player="Pvt.Danki" message="SC_TEST_123"
```

## Important

Satisfactory does not expose a vanilla Minecraft-style server plugin folder. Dedicated-server code is loaded through the Satisfactory Mod Loader and Unreal plugin packaging.

This plugin is designed to be built for a dedicated server target only and should not add recipes, assets, buildings, items, UI, or client gameplay changes. That is the closest Satisfactory currently gets to a server-only plugin.

If SML or the game version enforces identical mod lists for multiplayer joins, players may still need the matching client-side mod entry even if the plugin does nothing client-side. Do a test join before rolling it out to everyone.

## Build Shape

Place this folder in an SML/Alpakit modding project under:

```text
Mods/SatisfactoryCordChatTap
```

Then build the dedicated server target:

```text
Shipping Server / Linux
```

or:

```text
Shipping Server / Win64
```

Use the Satisfactory Mod Manager or ficsit-cli to install the built server package into the Pelican server. Do not copy a Windows client build onto a Linux dedicated server.

## Hook Point

The module includes `FSatisfactoryCordChatTapModule::EmitChatLine(PlayerName, Message)`, which writes the exact log format SatisfactoryCord reads.

Wire that helper to the Satisfactory/SML chat receive hook for your installed SML and game header version. The hook API can move between Satisfactory releases, so the wrapper intentionally depends only on the log contract above.

## Wrapper Setup

Set `SATISFACTORY_LOG_PATH` to the dedicated server log:

```env
SATISFACTORY_LOG_PATH=C:\Users\calam\Desktop\SatisfactoryCord\SatisfactoryDedicatedServer\FactoryGame\Saved\Logs\FactoryGame.log
```

After the plugin is installed and the server restarts, test from in-game chat:

```text
SC_TEST_123
```

Then check:

```powershell
Select-String -SimpleMatch -LiteralPath 'C:\Users\calam\Desktop\SatisfactoryCord\SatisfactoryDedicatedServer\FactoryGame\Saved\Logs\FactoryGame.log' -Pattern 'SC_TEST_123'
```

If that line appears in the log, SatisfactoryCord will relay it to Discord.
