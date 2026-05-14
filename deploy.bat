@echo off
echo === Build + Deploy Pontual Logistica ===
echo.

cd /d "%~dp0frontend"
echo [1/2] Compilando...
call npm run build
if errorlevel 1 (
    echo ERRO no build. Deploy cancelado.
    pause
    exit /b 1
)

cd /d "%~dp0"
echo.
echo [2/2] Fazendo deploy...
call firebase deploy --only hosting
if errorlevel 1 (
    echo ERRO no deploy.
    pause
    exit /b 1
)

echo.
echo Deploy concluido! https://pontual-logistica.web.app
pause
