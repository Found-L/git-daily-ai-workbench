# Windows-only helper: runs commands with repo-local tooling prepared under .tools.
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Command
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot ".tools"
$corepackHome = Join-Path $toolRoot "corepack-home"

function Invoke-NativeCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$ArgumentList = @()
  )

  $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -NoNewWindow -Wait -PassThru
  exit $process.ExitCode
}

$pathEntries = New-Object System.Collections.Generic.List[string]

$nodeDir = Get-ChildItem -Path $toolRoot -Directory -Filter "node-*" -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  Select-Object -First 1
if ($nodeDir) {
  $pathEntries.Add($nodeDir.FullName)
}

$gitBinary = Get-ChildItem -Path (Join-Path $toolRoot "mingit") -Recurse -File -Filter "git.exe" -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($gitBinary) {
  $pathEntries.Add($gitBinary.DirectoryName)
}

$ghBinary = Get-ChildItem -Path (Join-Path $toolRoot "gh") -Recurse -File -Filter "gh.exe" -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($ghBinary) {
  $pathEntries.Add($ghBinary.DirectoryName)
}

if ($pathEntries.Count -gt 0) {
  $env:PATH = (($pathEntries.ToArray() + @($env:PATH)) -join ";")
}

New-Item -ItemType Directory -Force -Path $corepackHome | Out-Null
$env:COREPACK_HOME = $corepackHome

if ($Command.Count -gt 0) {
  $commandName = $Command[0]
  $commandArgs =
    if ($Command.Count -gt 1) {
      @($Command[1..($Command.Count - 1)])
    } else {
      @()
    }

  if ($commandName -eq "pnpm") {
    $corepack = Get-Command corepack -ErrorAction SilentlyContinue
    if (-not $corepack) {
      throw "corepack was not found. Install Node.js 20.9+ or run .\\scripts\\bootstrap-tooling.ps1 first."
    }

    Invoke-NativeCommand -FilePath $corepack.Source -ArgumentList @("pnpm") + $commandArgs
  }

  $resolvedCommand = Get-Command $commandName -ErrorAction SilentlyContinue
  if (-not $resolvedCommand) {
    throw "Command '$commandName' was not found. Install the system toolchain or run .\\scripts\\bootstrap-tooling.ps1 first."
  }

  Invoke-NativeCommand -FilePath $resolvedCommand.Source -ArgumentList $commandArgs
}

Write-Host "Repo-local tooling has been prepared for the current PowerShell session."
Write-Host "Examples:"
Write-Host "  . .\\scripts\\with-tooling.ps1"
Write-Host "  .\\scripts\\with-tooling.ps1 pnpm install"
Write-Host "  .\\scripts\\with-tooling.ps1 git --version"
