@echo off
REM ============================================================
REM  Watchdog Pontual Logistica - roda a cada 2 minutos
REM  Verifica se Vite (5173) e Functions (5001) estao no ar
REM  Se algum cair, religa via iniciar-sistema.bat
REM ============================================================

set "LOG=%~dp0watchdog.log"
set "RESTART=0"

REM Verifica Vite (porta 5173)
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] Vite ^(5173^) DOWN >> "%LOG%"
    set "RESTART=1"
)

REM Verifica Functions (porta 5001)
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] Functions ^(5001^) DOWN >> "%LOG%"
    set "RESTART=1"
)

if "%RESTART%"=="1" (
    echo [%DATE% %TIME%] Disparando iniciar-sistema.bat >> "%LOG%"
    start "" /MIN cmd /c "%~dp0iniciar-sistema.bat"
) else (
    REM Log compacto de sucesso a cada execucao
    echo [%DATE% %TIME%] OK - Vite + Functions UP >> "%LOG%"
)

REM Trim log se passar de 500KB
for %%A in ("%LOG%") do if %%~zA GTR 512000 (
    powershell -Command "Get-Content '%LOG%' -Tail 200 | Set-Content '%LOG%.tmp'; Move-Item -Force '%LOG%.tmp' '%LOG%'"
)

exit /b 0
