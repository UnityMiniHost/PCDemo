@echo off
REM Run script for demo.exe
REM This script runs the demo application with the SDK DLL and runtime

echo ========================================
echo Running WebGLHost Native SDK Demo
echo ========================================

cd /d %~dp0\..

REM Check and extract host directory if needed
if not exist "host" (
    echo [INFO] host directory not found, extracting from native_sdk...
    if exist "native_sdk\windows\host.zip" (
        powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "native_sdk\windows" -OutputDir "." -ArchiveName "host"
        if %ERRORLEVEL% NEQ 0 (
            echo [ERROR] Failed to extract host directory!
            pause
            exit /b 1
        )
        echo [OK] host directory extracted successfully
    ) else (
        echo [ERROR] native_sdk\windows\host.zip not found!
        echo Please ensure the SDK package is complete.
        pause
        exit /b 1
    )
)

REM Check and extract runtime directory if needed
if not exist "runtime" (
    echo [INFO] runtime directory not found, extracting from native_sdk...
    if exist "native_sdk\windows\runtime.z01" (
        powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "native_sdk\windows" -OutputDir "." -ArchiveName "runtime"
        if %ERRORLEVEL% NEQ 0 (
            echo [ERROR] Failed to extract runtime directory!
            pause
            exit /b 1
        )
        echo [OK] runtime directory extracted successfully
    ) else if exist "native_sdk\windows\runtime.zip" (
        powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "native_sdk\windows" -OutputDir "." -ArchiveName "runtime"
        if %ERRORLEVEL% NEQ 0 (
            echo [ERROR] Failed to extract runtime directory!
            pause
            exit /b 1
        )
        echo [OK] runtime directory extracted successfully
    ) else (
        echo [ERROR] native_sdk\windows\runtime archive not found!
        echo Please ensure the SDK package is complete.
        pause
        exit /b 1
    )
)

REM Check if demo.exe exists
if not exist demo.exe (
    echo [ERROR] demo.exe not found!
    echo Please run scripts\build.bat first to build the executable.
    echo.
    pause
    exit /b 1
)

REM Check if DLL exists
if not exist host\webglhost_export.dll (
    echo [ERROR] host\webglhost_export.dll not found!
    echo Please copy the DLL from: ..\build\bin\Release\webglhost_export.dll
    echo Or run: scripts\copy-dependencies.bat
    echo.
    pause
    exit /b 1
)

REM Check if runtime exists
if not exist runtime\webglhost-runtime.exe (
    echo [ERROR] runtime\webglhost-runtime.exe not found!
    echo Please ensure the runtime directory is complete.
    echo Contact your SDK vendor if files are missing.
    echo.
    pause
    exit /b 1
)

echo.
echo All dependencies found. Starting test...
echo.
echo ========================================
echo.

REM Run the test
demo.exe

echo.
echo ========================================
echo Test finished!
echo ========================================
echo.

REM Check logs if they exist
if exist logs (
    echo Log files are available in: logs\
    echo.
)

pause

