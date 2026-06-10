@echo off
REM ============================================================
REM  Inicia ambiente Pontual Logistica (Firebase + Vite)
REM  Roda automaticamente no logon do Windows
REM ============================================================

REM Verifica se ja esta rodando (porta 5173)
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Sistema ja esta rodando ^(porta 5173 ocupada^). Saindo.
    timeout /t 3 >nul
    exit /b 0
)

echo ============================================================
echo  Iniciando Pontual Logistica - %DATE% %TIME%
echo ============================================================
echo.

REM Define JAVA_HOME pra esta sessao (caso nao esteja no env global)
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Aumenta timeout de descoberta das functions (default 10s e pouco)
set FUNCTIONS_DISCOVERY_TIMEOUT=60

REM Credencial pra Functions emulator falar com Firestore REAL (cloud).
REM Sem isso, Functions emulator subia o Firestore emulator local — que ficava
REM desincronizado do cloud onde o frontend escreve (motoristas_desligados etc).
set "GOOGLE_APPLICATION_CREDENTIALS=%~dp0scripts\serviceAccountKey.json"

echo [1/2] Iniciando Firebase Emulators em janela separada (so functions)...
start "Firebase Emulators - Pontual Logistica" cmd /k "cd /d %~dp0 && set FUNCTIONS_DISCOVERY_TIMEOUT=60 && set GOOGLE_APPLICATION_CREDENTIALS=%~dp0scripts\serviceAccountKey.json && firebase emulators:start --only functions --project pontual-logistica"

echo Aguardando 8 segundos pros emuladores subirem...
timeout /t 8 /nobreak >nul

echo [2/2] Iniciando Vite dev server em janela separada...
start "Vite Dev Server - Pontual Logistica" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo  Sistema iniciado!
echo  Acesse:  http://192.168.20.131:5173/rastreamento
echo  Local:   http://localhost:5173/rastreamento
echo  Emu UI:  http://localhost:4000
echo ============================================================
echo.
echo Esta janela vai fechar em 10 segundos.
echo Pra PARAR o sistema, use: parar-sistema.bat
timeout /t 10 >nul
exit
