@echo off
cd /d "%~dp0"
echo Downloading the latest version...
git pull
call npm.cmd install
pause
