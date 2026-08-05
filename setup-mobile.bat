@echo off
setlocal
cd /d "%~dp0"
echo Installing deps...
call npm install
if errorlevel 1 exit /b 1
echo Building...
call npm run build
if errorlevel 1 exit /b 1
echo Adding Capacitor Android platform (ok if already exists)...
call npx cap add android
call npm run cap:sync
echo DONE
