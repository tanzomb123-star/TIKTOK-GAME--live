@echo off
cd /d "%~dp0"
echo Go LIVE on TikTok first. Do not run the demo files at the same time.
set /p TIKTOK_USERNAME=Your TikTok username (without @): 
if "%TIKTOK_USERNAME%"=="" exit /b 1
start "Tower Live - TikTok" cmd /k npm.cmd run server
start "Tower Live - game" cmd /k npm.cmd run dev
timeout /t 5 >nul
start "" http://localhost:5173/
