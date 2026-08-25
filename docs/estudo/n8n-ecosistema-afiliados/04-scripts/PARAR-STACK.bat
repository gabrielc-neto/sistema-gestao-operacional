@echo off
cd /d "%~dp0..\02-docker"
echo Parando stack...
docker compose stop
echo.
echo Stack parado. Dados preservados nos volumes.
echo Pra remover TUDO (perde dados): docker compose down -v
echo.
pause
