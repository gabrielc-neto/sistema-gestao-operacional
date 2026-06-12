$pairs = @(
  @{ Name='.claude'; Src='C:\Users\Logistica01\.claude'; Dst='E:\Backup-Logistica-2026-06-10\.claude' },
  @{ Name='.codex';  Src='C:\Users\Logistica01\.codex';  Dst='E:\Backup-Logistica-2026-06-10\skills\dot_codex' }
)

foreach ($p in $pairs) {
  Write-Host ''
  Write-Host "=== $($p.Name) faltando ===" -ForegroundColor Yellow
  $srcRoot = $p.Src
  $dstRoot = $p.Dst
  $srcFiles = Get-ChildItem $srcRoot -Recurse -File -Force -ErrorAction SilentlyContinue
  $missing = @()
  foreach ($f in $srcFiles) {
    $rel = $f.FullName.Substring($srcRoot.Length).TrimStart('\')
    $dstPath = Join-Path $dstRoot $rel
    if (-not (Test-Path -LiteralPath $dstPath)) { $missing += $rel }
  }
  if ($missing.Count -eq 0) {
    Write-Host '  todos presentes'
  } else {
    Write-Host "  Total: $($missing.Count)"
    $missing | Select-Object -First 50 | ForEach-Object { "  $_" }
    if ($missing.Count -gt 50) {
      $extra = $missing.Count - 50
      Write-Host "  ... e mais $extra"
    }
  }
}
