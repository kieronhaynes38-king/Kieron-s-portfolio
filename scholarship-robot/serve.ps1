param(
  [int]$Port = 4173
)

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Scholarship Robot is already running at http://127.0.0.1:$Port/"
  exit 0
}

$node = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin") -Recurse -Filter "node.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $node) {
  $node = Get-Command node -ErrorAction Stop
}

New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "logs") | Out-Null

& $node.FullName (Join-Path $PSScriptRoot "server.mjs") --port $Port
