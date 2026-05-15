@echo off
REM Inicia Cloudflare Tunnel apontando pro Vite (porta 5173)
REM Gera URL pública HTTPS pra acessar o sistema fora da rede da Pontual
REM Mantenha esta janela aberta enquanto quiser acessar de casa
REM A URL aparece no terminal logo abaixo de "Your quick Tunnel has been created!"

echo Iniciando tunel Cloudflare...
echo IMPORTANTE: anote a URL https://....trycloudflare.com que aparecer abaixo
echo Aperte Ctrl+C pra parar o tunel quando nao precisar mais
echo.
"%~dp0bin\cloudflared.exe" tunnel --url http://localhost:5173
pause
