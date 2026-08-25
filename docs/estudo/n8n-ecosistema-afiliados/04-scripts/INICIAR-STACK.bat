@echo off
REM =====================================================
REM  Ecossistema n8n Afiliados - Iniciar Stack
REM  Duplo-clique nesse arquivo
REM =====================================================

echo.
echo ========================================================
echo   ECOSSISTEMA n8n AFILIADOS - iniciando stack Docker
echo ========================================================
echo.

REM Ir pra pasta docker
cd /d "%~dp0..\02-docker"

REM Verificar se .env existe
if not exist ".env" (
    echo.
    echo [ERRO] Arquivo .env nao encontrado!
    echo.
    echo Copie .env.example para .env e preencha suas chaves antes de continuar.
    echo.
    pause
    exit /b 1
)

REM Verificar Docker rodando
docker ps >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] Docker Desktop nao esta rodando.
    echo Abra o Docker Desktop e tente de novo.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker rodando
echo [OK] .env encontrado
echo.
echo Subindo containers...
docker compose up -d

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao subir containers. Veja mensagem acima.
    pause
    exit /b 1
)

echo.
echo Aguardando Postgres ficar pronto (30s)...
timeout /t 30 /nobreak >nul

echo.
echo Criando tabelas do banco...
docker exec -i n8n-postgres psql -U n8n -d n8n < init-postgres.sql
if errorlevel 1 (
    echo [AVISO] Falha ao criar tabelas. Pode ser que ja existam. Ignorando.
)

echo.
echo ========================================================
echo   STACK PRONTO!
echo ========================================================
echo.
echo   n8n:            http://localhost:5678
echo   Evolution API:  http://localhost:8080
echo.
echo   Proximo passo: importar os 7 workflows em 03-workflows/
echo.
pause
