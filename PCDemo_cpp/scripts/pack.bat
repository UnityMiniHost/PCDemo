@echo off
REM Pack script for host and runtime directories (Windows)
REM This script compresses host and runtime directories into native_sdk\windows

echo ========================================
echo Packing host and runtime directories
echo ========================================

cd /d %~dp0\..

REM Check if host directory exists
if not exist "host" (
    echo [ERROR] host directory not found!
    echo Please ensure the host directory exists before packing.
    pause
    exit /b 1
)

REM Check if runtime directory exists
if not exist "runtime" (
    echo [ERROR] runtime directory not found!
    echo Please ensure the runtime directory exists before packing.
    pause
    exit /b 1
)

REM Create native_sdk\windows directory if it doesn't exist
if not exist "native_sdk\windows" (
    echo [INFO] Creating native_sdk\windows directory...
    mkdir native_sdk\windows
)

echo.
echo [INFO] Compressing host directory...
powershell -ExecutionPolicy Bypass -File "scripts\compress_split.ps1" -SourceDir "host" -OutputDir "native_sdk\windows" -ArchiveName "host" -ChunkSizeMB 50

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to compress host directory!
    pause
    exit /b 1
)

echo [OK] host directory compressed successfully
echo.

echo [INFO] Compressing runtime directory...
powershell -ExecutionPolicy Bypass -File "scripts\compress_split.ps1" -SourceDir "runtime" -OutputDir "native_sdk\windows" -ArchiveName "runtime" -ChunkSizeMB 50

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to compress runtime directory!
    pause
    exit /b 1
)

echo [OK] runtime directory compressed successfully
echo.

echo ========================================
echo Packing completed successfully!
echo ========================================
echo.
echo Compressed archives are located in: native_sdk\windows\
echo.
