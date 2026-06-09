@echo off
cd /d "%~dp0"
wscript.exe ".\start-hidden.vbs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173/"
