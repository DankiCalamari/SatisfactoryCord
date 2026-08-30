# GitHub Actions Mod Build

GitHub can build `SatisfactoryCordChatTap`, but not on a normal hosted runner.

The mod requires the Satisfactory modding Unreal Engine build, Wwise integration, and an SML/Alpakit `FactoryGame.uproject`. Those tools are too large and too license-sensitive to assume on GitHub's public runners.

## Recommended Setup

Use a self-hosted Windows GitHub Actions runner on a PC that already has:

- Satisfactory Modding custom Unreal Engine installed
- SatisfactoryModLoader project checked out and set up
- Wwise integrated into the SML project
- Visual Studio C++ build tools installed
- Linux cross-compile toolchain installed if building `LinuxServer`

Then configure repository variables:

```text
SML_PROJECT_DIR=C:\Path\To\SatisfactoryModLoader
UNREAL_ENGINE_DIR=C:\Path\To\UE_5.6.1-CSS
```

GitHub repository page:

```text
Settings -> Secrets and variables -> Actions -> Variables
```

## Run The Build

Open:

```text
Actions -> Build SatisfactoryCordChatTap -> Run workflow
```

Choose:

```text
LinuxServer
```

for a Pelican/Linux dedicated server.

When the workflow finishes, download the artifact named:

```text
SatisfactoryCordChatTap-LinuxServer
```

## Why Not GitHub Hosted?

GitHub-hosted Windows runners do not include the Satisfactory custom Unreal Engine install or your configured SML modding project. A hosted runner could only work if you supplied those dependencies yourself through private caches/artifacts and accepted the license/storage/time cost.
