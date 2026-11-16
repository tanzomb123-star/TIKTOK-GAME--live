@echo off
cd /d "%~dp0"
echo Starting Team War with a DEMO audience...
start "Team War - demo audience" cmd /k npm.cmd run mock:war
start "Team War - game" cmd /k npm.cmd run dev
timeout /t 5 >nul
start "" http://localhost:5173/war.html
