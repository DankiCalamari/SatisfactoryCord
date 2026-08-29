param(
    [string]$SmlProjectDir = "",
    [string]$UnrealEngineDir = "",
    [ValidateSet("LinuxServer", "WindowsServer")]
    [string]$Target = "LinuxServer"
)

$ErrorActionPreference = "Stop"

$pluginName = "SatisfactoryCordChatTap"
$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$pluginSource = Join-Path $PSScriptRoot $pluginName

if (-not (Test-Path -LiteralPath (Join-Path $pluginSource "$pluginName.uplugin"))) {
    throw "Could not find $pluginName.uplugin at $pluginSource"
}

if (-not $SmlProjectDir) {
    $candidate = "C:\Users\calam\AppData\Local\Temp\SatisfactoryModLoaderSparse"
    if (Test-Path -LiteralPath (Join-Path $candidate "FactoryGame.uproject")) {
        $SmlProjectDir = $candidate
    }
}

if (-not $SmlProjectDir -or -not (Test-Path -LiteralPath (Join-Path $SmlProjectDir "FactoryGame.uproject"))) {
    throw "SML project not found. Pass -SmlProjectDir pointing at a SatisfactoryModLoader project containing FactoryGame.uproject."
}

if (-not $UnrealEngineDir) {
    $engineCandidates = @(
        "C:\Program Files\Epic Games\UE_5.6",
        "C:\Program Files\Epic Games\UE_5.6.1-CSS",
        "C:\Program Files\Unreal Engine\UE_5.6",
        "C:\Program Files\Unreal Engine\UE_5.6.1-CSS"
    )
    foreach ($candidate in $engineCandidates) {
        if (Test-Path -LiteralPath (Join-Path $candidate "Engine\Build\BatchFiles\RunUAT.bat")) {
            $UnrealEngineDir = $candidate
            break
        }
    }
}

$runUat = if ($UnrealEngineDir) { Join-Path $UnrealEngineDir "Engine\Build\BatchFiles\RunUAT.bat" } else { "" }
if (-not $runUat -or -not (Test-Path -LiteralPath $runUat)) {
    throw "Unreal RunUAT.bat not found. Install the Satisfactory Modding Unreal Engine build, then pass -UnrealEngineDir."
}

$destination = Join-Path $SmlProjectDir "Mods\$pluginName"
if (Test-Path -LiteralPath $destination) {
    Remove-Item -LiteralPath $destination -Recurse -Force
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
Copy-Item -LiteralPath $pluginSource -Destination $destination -Recurse -Force

$projectPath = Join-Path $SmlProjectDir "FactoryGame.uproject"
$serverPlatform = if ($Target -eq "WindowsServer") { "Win64" } else { "Linux" }

$arguments = @(
    "-ScriptsForProject=`"$projectPath`"",
    "PackagePlugin",
    "-project=`"$projectPath`"",
    "-clientconfig=Shipping",
    "-serverconfig=Shipping",
    "-utf8output",
    "-DLCName=$pluginName",
    "-build",
    "-server",
    "-serverplatform=$serverPlatform",
    "-noclient",
    "-nocompileeditor",
    "-merge"
)

Write-Host "Building $pluginName for $Target..."
Write-Host "`"$runUat`" $($arguments -join ' ')"
& $runUat @arguments

$archiveDir = Join-Path $SmlProjectDir "Saved\ArchivedPlugins\$pluginName"
if (Test-Path -LiteralPath $archiveDir) {
    $outputDir = Join-Path $repoRoot "outputs\$pluginName"
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    Copy-Item -LiteralPath (Join-Path $archiveDir "*") -Destination $outputDir -Force
    Write-Host "Copied build artifacts to $outputDir"
} else {
    Write-Warning "Build finished, but no archived plugin directory was found at $archiveDir"
}
