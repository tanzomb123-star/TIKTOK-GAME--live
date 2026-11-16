@echo off
cd /d "%~dp0"
echo Starting Tower Live with a DEMO audience...
start "Tower Live - demo audience" cmd /k npm.cmd run mock
start "Tower Live - game" cmd /k npm.cmd run dev
timeout /t 5 >nul
start "" http://localhost:5173/
