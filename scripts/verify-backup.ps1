# Diff origem (C:) vs backup (E:) - confirma se backup pegou tudo
$src = @{
  '.claude'         = 'C:\Users\Logistica01\.claude'
  '.serena'         = 'C:\Users\Logistica01\.serena'
  '.codex'          = 'C:\Users\Logistica01\.codex'
  '.claude-flow'    = 'C:\Users\Logistica01\.claude-flow'
  '.claude-backups' = 'C:\Users\Logistica01\.claude-backups'
  '.cagent'         = 'C:\Users\Logistica01\.cagent'
  '.copilot'        = 'C:\Users\Logistica01\.copilot'
  '.mempalace'      = 'C:\Users\Logistica01\.mempalace'
  '.notebooklm'     = 'C:\Users\Logistica01\.notebooklm'
}
$dst = @{
  '.claude'         = 'E:\Backup-Logistica-2026-06-10\.claude'
  '.serena'         = 'E:\Backup-Logistica-2026-06-10\skills\dot_serena'
  '.codex'          = 'E:\Backup-Logistica-2026-06-10\skills\dot_codex'
  '.claude-flow'    = 'E:\Backup-Logistica-2026-06-10\skills\dot_claude-flow'
  '.claude-backups' = 'E:\Backup-Logistica-2026-06-10\skills\dot_claude-backups'
  '.cagent'         = 'E:\Backup-Logistica-2026-06-10\skills\dot_cagent'
  '.copilot'        = 'E:\Backup-Logistica-2026-06-10\skills\dot_copilot'
  '.mempalace'      = 'E:\Backup-Logistica-2026-06-10\skills\dot_mempalace'
  '.notebooklm'     = 'E:\Backup-Logistica-2026-06-10\skills\dot_notebooklm'
}

'{0,-22} {1,10} {2,10} {3,12} {4,12}  {5}' -f 'Dir','OrigArq','DestArq','OrigMB','DestMB','OK?'
'-' * 80

foreach ($k in ($src.Keys | Sort-Object)) {
  $sFiles = Get-ChildItem $src[$k] -Recurse -File -Force -ErrorAction SilentlyContinue
  $dFiles = Get-ChildItem $dst[$k] -Recurse -File -Force -ErrorAction SilentlyContinue
  $sCount = $sFiles.Count
  $dCount = $dFiles.Count
  $sMB = if ($sFiles) { ($sFiles | Measure-Object Length -Sum).Sum / 1MB } else { 0 }
  $dMB = if ($dFiles) { ($dFiles | Measure-Object Length -Sum).Sum / 1MB } else { 0 }
  $delta = $sCount - $dCount
  $ok = if ($delta -eq 0) { 'OK' } elseif ($delta -lt 0) { "+$([Math]::Abs($delta)) extra no dest" } else { "$delta FALTANDO" }
  '{0,-22} {1,10} {2,10} {3,12:N1} {4,12:N1}  {5}' -f $k, $sCount, $dCount, $sMB, $dMB, $ok
}
