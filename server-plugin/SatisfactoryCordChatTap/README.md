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

From this repository, you can also use:

```powershell
.\server-plugin\build-satisfactorycord-chat-tap.ps1 -SmlProjectDir C:\Path\To\SatisfactoryModLoader -UnrealEngineDir "C:\Path\To\UE_5.6.1-CSS" -Target LinuxServer
```

The script copies the plugin into the SML project, runs Alpakit's `PackagePlugin` automation command, and copies archived output to `outputs/SatisfactoryCordChatTap`.

## Hook Point

The module subscribes to `AFGChatManager::BroadcastChatMessage` with SML's native hook manager. It logs only `CMT_PlayerMessage` chat, then writes the exact log format SatisfactoryCord reads.

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
