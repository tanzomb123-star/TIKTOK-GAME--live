@echo off
cd /d "%~dp0"
echo ==========================================
echo   TIKTOK-GAME--live : install
echo ==========================================
where node >nul 2>nul
if errorlevel 1 goto installnode
for /f "tokens=1 delims=v." %%a in ('node -v') do set NODEMAJOR=%%a
echo Found Node.js version:
node -v
if %NODEMAJOR% LSS 22 goto installnode
goto npminstall

:installnode
echo.
echo Node.js 22 or newer is required. Installing Node.js LTS with winget...
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto nodefail
echo.
echo Node.js installed.
echo CLOSE this window, then double-click 1-install.bat again.
echo If it still says version 20: uninstall the old "Node.js" in Windows Settings - Apps, then try again.
pause
exit /b 0

:nodefail
echo.
echo Automatic install failed.
echo Please download and install Node.js LTS from https://nodejs.org
echo then double-click 1-install.bat again.
start "" https://nodejs.org
pause
exit /b 1

:npminstall
echo.
echo Installing game packages (this can take a few minutes)...
call npm.cmd install
if errorlevel 1 goto npmfail
echo.
echo Running tests...
call npm.cmd test
echo.
echo ==========================================
echo   DONE. Double-click 2-play-tower.bat or 3-play-war.bat
echo ==========================================
pause
exit /b 0

:npmfail
echo.
echo npm install failed. Take a screenshot of this window and send it.
pause
exit /b 1
