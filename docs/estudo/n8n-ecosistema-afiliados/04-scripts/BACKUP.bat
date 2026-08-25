@echo off
REM =====================================================
REM  Backup diario Postgres + workflows n8n
REM  Agende no Task Scheduler pra rodar 3AM todo dia
REM =====================================================

set BACKUP_DIR=%~dp0..\backups
set DATA=%date:~-4%-%date:~3,2%-%date:~0,2%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Backup Postgres em: %BACKUP_DIR%\pg-%DATA%.sql
docker exec n8n-postgres pg_dump -U n8n -d n8n > "%BACKUP_DIR%\pg-%DATA%.sql"

echo Backup workflows n8n
docker cp n8n-main:/home/node/.n8n/database.sqlite "%BACKUP_DIR%\n8n-db-%DATA%.sqlite" 2>nul

echo.
echo Backups salvos em %BACKUP_DIR%
echo Mantendo apenas ultimos 30 dias...
forfiles /P "%BACKUP_DIR%" /M *.sql /D -30 /C "cmd /c del @path" 2>nul
forfiles /P "%BACKUP_DIR%" /M *.sqlite /D -30 /C "cmd /c del @path" 2>nul

echo Feito.
