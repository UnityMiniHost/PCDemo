@echo off
setlocal

:: WebGLHost Runtime App - Windows Batch Entry Point
:: 支持Windows平台的命令行启动

:: 检查Node.js是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js 16.0.0 or higher from https://nodejs.org/
    pause
    exit /b 1
)

:: 获取当前脚本目录
set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%.."

:: 启动Node.js应用
node "%SCRIPT_DIR%webglhost-runtime-app" %*

endlocal