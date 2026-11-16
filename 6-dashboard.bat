@echo off
cd /d "%~dp0"
echo Opening the streamer dashboard (keep the game/live windows running).
echo If the game is not running yet, start 4-live-*.bat or a demo file first.
start "" http://localhost:5173/dashboard.html
