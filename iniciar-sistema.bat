@echo off
setlocal EnableDelayedExpansion
REM ============================================================
REM  Inicia ambiente Pontual Logistica — TUDO AUTOMATICO
REM  1. Firebase Emulators (functions + auth)
REM  2. Vite dev server
REM  3. Cloudflare tunnel (quick tunnel, URL nova a cada boot)
REM  4. Grava URL do tunel em TUNNEL-URL.md (Obsidian ve)
REM  5. Atualiza Firebase authorized domains via API
REM ============================================================

REM ------------------------------------------------------------
REM Sistema ja rodando? (porta 5173 do Vite)
REM ------------------------------------------------------------
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

REM ------------------------------------------------------------
REM JAVA_HOME auto-detect
REM ------------------------------------------------------------
if exist "C:\Users\Logistica01\jdk21\jdk-21.0.11+10\bin\java.exe" (
    set "JAVA_HOME=C:\Users\Logistica01\jdk21\jdk-21.0.11+10"
) else if exist "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
) else (
    echo [ERRO] JDK21 nao encontrado.
    pause
    exit /b 1
)
set "PATH=%JAVA_HOME%\bin;%PATH%"
set FUNCTIONS_DISCOVERY_TIMEOUT=60
set "GOOGLE_APPLICATION_CREDENTIALS=%~dp0scripts\serviceAccountKey.json"

echo Usando JAVA_HOME=!JAVA_HOME!
echo.

REM ------------------------------------------------------------
REM [0/4] Snapshot da conversa Claude Code anterior (se houver)
REM ------------------------------------------------------------
if exist "%~dp0scripts\exportar-conversa-claude.mjs" (
    echo [0/4] Exportando conversa Claude Code mais recente...
    node "%~dp0scripts\exportar-conversa-claude.mjs" 2>nul
    echo.
)

REM ------------------------------------------------------------
REM [1/4] Firebase Emulators
REM ------------------------------------------------------------
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [1/4] Firebase Emulators ja rodando ^(porta 5001^). Reuso.
) else (
    echo [1/4] Iniciando Firebase Emulators ^(functions + auth^)...
    start "Firebase Emulators" cmd /k "cd /d %~dp0 && set FUNCTIONS_DISCOVERY_TIMEOUT=60 && set GOOGLE_APPLICATION_CREDENTIALS=%~dp0scripts\serviceAccountKey.json && set PATH=!JAVA_HOME!\bin;%%PATH%% && firebase emulators:start --only functions,auth --project pontual-logistica"

    echo Aguardando emulador na porta 5001...
    set /a wait_count=0
    :wait_emulator
    timeout /t 2 /nobreak >nul
    set /a wait_count+=1
    netstat -ano | findstr ":5001" | findstr "LISTENING" >nul 2>&1
    if %errorlevel%==0 (
        echo   OK apos !wait_count! checagens.
        goto emulator_ready
    )
    if !wait_count! LSS 30 (
        echo   ...aguardando ^(!wait_count!/30^)
        goto wait_emulator
    )
    echo   [AVISO] Emulador nao subiu em 60s. Continuando.
    :emulator_ready
)
echo.

REM ------------------------------------------------------------
REM [2/4] Vite dev server
REM ------------------------------------------------------------
echo [2/4] Iniciando Vite dev server...
start "Vite Dev" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Aguardando Vite na porta 5173...
set /a wait_count=0
:wait_vite
timeout /t 2 /nobreak >nul
set /a wait_count+=1
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo   OK apos !wait_count! checagens.
    goto vite_ready
)
if !wait_count! LSS 30 (
    echo   ...aguardando ^(!wait_count!/30^)
    goto wait_vite
)
echo   [AVISO] Vite nao subiu em 60s. Continuando.
:vite_ready
echo.

REM ------------------------------------------------------------
REM [3/4] Cloudflare Tunnel (quick tunnel — URL nova a cada boot)
REM ------------------------------------------------------------
if not exist "C:\Users\Logistica01\tools\cloudflared.exe" (
    echo [3/4] cloudflared.exe nao encontrado em tools\. Pulando tunel.
    goto skip_tunnel
)

REM Se ja tem cloudflared rodando, mata pra criar tunel novo
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if %errorlevel%==0 (
    echo [3/4] Matando cloudflared anterior...
    taskkill /F /IM cloudflared.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo [3/4] Iniciando Cloudflare Tunnel...
REM Redireciona logs pra arquivo pra capturar URL depois
del "%~dp0tunnel.log" 2>nul
start "Cloudflare Tunnel" cmd /k "C:\Users\Logistica01\tools\cloudflared.exe tunnel --url http://localhost:5173 --no-autoupdate > "%~dp0tunnel.log" 2>&1"

echo Aguardando URL do tunel aparecer...
set /a wait_count=0
:wait_tunnel
timeout /t 2 /nobreak >nul
set /a wait_count+=1
if exist "%~dp0tunnel.log" (
    findstr /R /C:"https://.*\.trycloudflare\.com" "%~dp0tunnel.log" >nul 2>&1
    if !errorlevel!==0 (
        echo   URL do tunel obtida apos !wait_count! checagens.
        goto tunnel_ready
    )
)
if !wait_count! LSS 30 (
    echo   ...aguardando ^(!wait_count!/30^)
    goto wait_tunnel
)
echo   [AVISO] Tunel nao respondeu em 60s. Sem URL publica.
goto skip_tunnel

:tunnel_ready
REM Extrai URL do log e grava em TUNNEL-URL.md pro Obsidian ver
for /f "tokens=* delims=" %%a in ('powershell -NoProfile -Command "(Select-String -Path '%~dp0tunnel.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1).Matches.Value"') do set "TUNNEL_URL=%%a"

if defined TUNNEL_URL (
    echo   URL: !TUNNEL_URL!
    REM Grava arquivo Markdown pro Obsidian
    (
        echo # URL do Tunel Cloudflare
        echo.
        echo **Atualizado:** %DATE% %TIME%
        echo.
        echo ^> Esta URL muda a cada boot ^(Quick Tunnel gratis^).
        echo.
        echo ## Dashboard
        echo.
        echo !TUNNEL_URL!/dashboard
        echo.
        echo ## Rastreamento
        echo.
        echo !TUNNEL_URL!/rastreamento
        echo.
        echo ## Login
        echo.
        echo !TUNNEL_URL!/login
    ) > "%~dp0TUNNEL-URL.md"

    REM ------------------------------------------------------------
    REM [4/4] Atualiza Firebase authorized domain (best-effort)
    REM ------------------------------------------------------------
    echo [4/4] Atualizando Firebase authorized domains...
    powershell -NoProfile -Command "$env:TUNNEL_URL='!TUNNEL_URL!'; node '%~dp0scripts\add-authorized-domain.js' 2>&1" 2>nul
    if !errorlevel!==0 (
        echo   OK — dominio autorizado.
    ) else (
        echo   [AVISO] Nao consegui atualizar authorized domains. Faca manual se der erro de login.
    )
)

:skip_tunnel
echo.

REM ------------------------------------------------------------
REM [5/5] Daemon de notificações de vencimentos (toast Windows)
REM       Roda em background, verifica a cada 4h
REM ------------------------------------------------------------
echo [5/5] Iniciando daemon de vencimentos (toast Windows)...
start "Notif Vencimentos" /min cmd /c "cd /d %~dp0functions && node scripts/notificar-vencimentos.mjs --daemon"
echo   OK — daemon rodando em janela minimizada. Fecha ela pra parar as notificacoes.
echo.

REM ------------------------------------------------------------
REM Resumo final
REM ------------------------------------------------------------
echo ============================================================
echo  Sistema iniciado!
echo.
echo  Local:   http://localhost:5173/dashboard
if defined TUNNEL_URL (
    echo  Publico: !TUNNEL_URL!/dashboard
    echo  URL salva em: TUNNEL-URL.md ^(abra no Obsidian^)
)
echo  Emu UI:  http://localhost:4000
echo ============================================================
echo.
echo Pra PARAR o sistema, use: parar-sistema.bat
echo Esta janela fecha em 15 segundos.
timeout /t 15 >nul
exit
