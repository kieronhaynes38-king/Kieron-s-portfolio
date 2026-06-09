$connections = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue

if (-not $connections) {
  Write-Host "Scholarship Robot is not running."
  exit 0
}

$connections |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
  }

Write-Host "Scholarship Robot stopped."
