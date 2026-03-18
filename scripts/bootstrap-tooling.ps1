$ErrorActionPreference = "Stop"

$toolRoot = "D:\AI\.tools"
$nodeVersion = "v22.14.0"
$gitVersion = "2.48.1.windows.1"
$ghVersion = "2.69.0"

New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null

$nodeZip = Join-Path $toolRoot "node.zip"
$gitZip = Join-Path $toolRoot "mingit.zip"
$ghZip = Join-Path $toolRoot "gh.zip"

curl.exe -L "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip" -o $nodeZip
curl.exe -L "https://github.com/git-for-windows/git/releases/download/v$gitVersion/MinGit-2.48.1-64-bit.zip" -o $gitZip
curl.exe -L "https://github.com/cli/cli/releases/download/v$ghVersion/gh_${ghVersion}_windows_amd64.zip" -o $ghZip

Expand-Archive -Path $nodeZip -DestinationPath $toolRoot -Force
Expand-Archive -Path $gitZip -DestinationPath (Join-Path $toolRoot "mingit") -Force
Expand-Archive -Path $ghZip -DestinationPath (Join-Path $toolRoot "gh") -Force

Write-Host "Portable tooling downloaded to $toolRoot"
