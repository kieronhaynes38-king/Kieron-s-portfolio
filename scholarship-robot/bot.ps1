param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$BotArguments
)

$node = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin") -Recurse -Filter "node.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $node) {
  $node = Get-Command node -ErrorAction Stop
}

& $node.FullName (Join-Path $PSScriptRoot "bot.mjs") @BotArguments
