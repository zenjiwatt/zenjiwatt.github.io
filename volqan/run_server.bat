@echo off
title Volqan OS HTTP Server Launcher
echo =======================================================
echo VOLQAN OS - LOCAL HTTP SERVER LAUNCHER
echo =======================================================
echo Modern web browsers restrict folder access for local pages
echo opened directly via file://. This script runs a quick
echo local server to let default songs load perfectly!
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python detected! Launching server on http://localhost:8000...
    echo.
    echo Press Ctrl+C inside this window to stop the server at any time.
    start http://localhost:8000
    python -m http.server 8000
    goto end
)

:: Check if Node is installed
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js detected! Launching server on http://localhost:8080...
    echo.
    npx -y http-server -p 8080 -o
    goto end
)

echo ERROR: Neither Python nor Node.js was detected on your system.
echo.
echo To load default songs automatically, please install Python or Node.js.
echo.
echo In the meantime, you can continue double-clicking index.html and
echo using the "+ Add MP3" button to manually select your songs!
echo.
pause

:end
