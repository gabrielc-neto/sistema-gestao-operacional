@echo off
set "JAVA_HOME=C:\Users\Logistica01\jdk21\jdk-21.0.11+10"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set FUNCTIONS_DISCOVERY_TIMEOUT=60
set "GOOGLE_APPLICATION_CREDENTIALS=%~dp0scripts\serviceAccountKey.json"
cd /d %~dp0
echo === JAVA ===
java -version
echo === FIREBASE ===
call firebase emulators:start --only functions,auth --project pontual-logistica
