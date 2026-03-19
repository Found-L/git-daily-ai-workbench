# Windows-only helper: downloads repo-local Node/Git/GitHub CLI archives for this repository.
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot ".tools"
$nodeVersion = "v22.14.0"
$gitVersion = "2.48.1.windows.1"
$ghVersion = "2.69.0"
$nodeArchiveName = "node-$nodeVersion-win-x64.zip"
$gitArchiveName = "MinGit-$gitVersion-64-bit.zip"
$ghArchiveName = "gh_${ghVersion}_windows_amd64.zip"

New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $toolRoot "corepack-home") | Out-Null

$nodeZip = Join-Path $toolRoot "node.zip"
$gitZip = Join-Path $toolRoot "mingit.zip"
$ghZip = Join-Path $toolRoot "gh.zip"

curl.exe -L "https://nodejs.org/dist/$nodeVersion/$nodeArchiveName" -o $nodeZip
curl.exe -L "https://github.com/git-for-windows/git/releases/download/v$gitVersion/$gitArchiveName" -o $gitZip
curl.exe -L "https://github.com/cli/cli/releases/download/v$ghVersion/$ghArchiveName" -o $ghZip

Expand-Archive -Path $nodeZip -DestinationPath $toolRoot -Force
Expand-Archive -Path $gitZip -DestinationPath (Join-Path $toolRoot "mingit") -Force
Expand-Archive -Path $ghZip -DestinationPath (Join-Path $toolRoot "gh") -Force

Write-Host "Portable tooling downloaded to $toolRoot"
Write-Host "Run .\\scripts\\with-tooling.ps1 pnpm install to use the repo-local toolchain."
