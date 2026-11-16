@echo off
cd /d "%~dp0"
echo Go LIVE on TikTok first. Do not run the demo files at the same time.
set /p TIKTOK_USERNAME=Your TikTok username (without @): 
if "%TIKTOK_USERNAME%"=="" exit /b 1
start "Team War - TikTok" cmd /k npm.cmd run server
start "Team War - game" cmd /k npm.cmd run dev
timeout /t 5 >nul
start "" http://localhost:5173/war.html
