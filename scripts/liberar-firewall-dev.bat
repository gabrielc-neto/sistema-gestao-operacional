@echo off
REM Libera portas 5173 (Vite) e 5001 (Firebase Functions emulator) no Windows Firewall
REM Execute uma vez com botão direito > Executar como administrador

echo Liberando porta 5173 (Vite dev server)...
netsh advfirewall firewall delete rule name="Pontual-Dev-Vite-5173" >nul 2>&1
netsh advfirewall firewall add rule name="Pontual-Dev-Vite-5173" dir=in action=allow protocol=TCP localport=5173 profile=private,domain

echo Liberando porta 5001 (Firebase Functions emulator)...
netsh advfirewall firewall delete rule name="Pontual-Dev-Functions-5001" >nul 2>&1
netsh advfirewall firewall add rule name="Pontual-Dev-Functions-5001" dir=in action=allow protocol=TCP localport=5001 profile=private,domain

echo.
echo === Regras criadas com sucesso! ===
echo.
echo IP desta maquina na rede:
ipconfig | findstr /R "IPv4"
echo.
echo No celular, acesse: http://192.168.20.131:5173
echo.
pause
