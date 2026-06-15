@echo off
set "NODE_EXE=%LOCALAPPDATA%\OpenAI\Codex\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" "%~dp0server.mjs"
