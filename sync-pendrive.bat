@echo off
REM ============================================================
REM  Sincroniza vault + repo atual pro pendrive D:
REM  Roda quando D: estiver plugado
REM ============================================================

if not exist D:\ (
    echo [ERRO] Pendrive D: nao plugado. Abortando.
    pause
    exit /b 1
)

echo Sincronizando vault Obsidian + repo pra D:\Backup-Logistica-%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%\
echo.

set "SRC=C:\Users\Logistica01\projetos\logistica-ia"
set "DST=D:\Backup-Logistica-%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%"

REM Cria pasta com timestamp
mkdir "%DST%" 2>nul

REM Robocopy — exclui pesados. /XD precisa caminho absoluto pra bater com path completo
robocopy "%SRC%" "%DST%" *.* /E /MT:8 /R:1 /W:1 ^
  /XD "%SRC%\arquivo\pendrive-completo" "%SRC%\arquivo\downloads-pontual" "node_modules" ".git" "dist" "build" ".firebase" ^
  /NP /LOG:"%DST%\_backup.log"

set RC=%ERRORLEVEL%
echo.
echo Exit code robocopy: %RC%
echo (0-3 = sucesso, 4+ = alguma falha)
echo.
echo === Conteudo backupeado ===
dir "%DST%" /A:D /B
echo.
echo Backup em: %DST%
pause
