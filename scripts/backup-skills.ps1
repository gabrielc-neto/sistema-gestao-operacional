# Backup de todos os diretorios de IA/agentes pro pendrive
$dest = 'E:\Backup-Logistica-2026-06-10\skills'
New-Item -ItemType Directory -Path $dest -Force | Out-Null

$dirs = @('.serena','.codex','.claude-flow','.claude-backups','.cagent','.copilot','.mempalace','.notebooklm')
$results = @()

foreach ($d in $dirs) {
    $src = "C:\Users\Logistica01\$d"
    $dstName = $d -replace '^\.', 'dot_'
    $dst = Join-Path $dest $dstName

    if (-not (Test-Path $src)) {
        $results += [PSCustomObject]@{ Dir = $d; Status = "FONTE_AUSENTE"; Tamanho = "-" }
        continue
    }

    Write-Host "Copiando $d -> $dstName ..." -ForegroundColor Cyan
    $null = robocopy $src $dst /E /XD logs node_modules .git /NFL /NDL /NJH /NJS /R:1 /W:2

    # robocopy exit codes 0-7 = sucesso, 8+ = erro
    $rc = $LASTEXITCODE
    $statusOK = $rc -lt 8
    $size = (Get-ChildItem $dst -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeMB = "{0:N1} MB" -f ($size / 1MB)
    $results += [PSCustomObject]@{ Dir = $d; Status = (if ($statusOK) { "OK (rc=$rc)" } else { "FALHA (rc=$rc)" }); Tamanho = $sizeMB }
}

Write-Host ""
Write-Host "=== RESULTADO ===" -ForegroundColor Yellow
$results | Format-Table -AutoSize
