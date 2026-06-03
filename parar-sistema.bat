@echo off
REM ============================================================
REM  Para o ambiente Pontual Logistica
REM  Mata processos nas portas 5173, 5001, 8080, 9099, 4000
REM ============================================================

echo Parando Pontual Logistica...
echo.

setlocal enabledelayedexpansion
set "PORTS=5173 5001 8080 9099 4000 4400 4500 9150"

for %%P in (%PORTS%) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
        echo Matando processo PID %%A na porta %%P
        taskkill /F /PID %%A >nul 2>&1
    )
)

echo.
echo Sistema parado. Pra reiniciar use: iniciar-sistema.bat
echo Esta janela vai fechar em 5 segundos.
timeout /t 5 >nul
exit
