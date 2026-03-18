$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot ".tools"
$env:PATH = "$toolRoot\node-v22.14.0-win-x64;$toolRoot\mingit\cmd;$toolRoot\gh\bin;$env:PATH"
$env:COREPACK_HOME = "$toolRoot\corepack-home"
Write-Host "Tooling PATH injected for Node, Git, gh, and Corepack."
