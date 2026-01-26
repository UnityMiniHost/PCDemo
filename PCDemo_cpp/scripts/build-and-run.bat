@echo off
REM Build and run script - automates the entire process
REM This script builds demo.exe, copies dependencies, and runs the test

echo ========================================
echo WebGLHost Native - Build and Run
echo ========================================

cd /d %~dp0\..

REM Step 1: Build demo.exe
echo.
echo [Step 1/2] Building demo.exe...
echo.

call scripts\build.bat

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

REM Step 2: Run the test
echo.
echo [Step 2/2] Running test...
echo.

call scripts\run.bat

echo.
echo ========================================
echo Build and Run Complete!
echo ========================================

