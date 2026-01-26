@echo off
REM Build script for demo.exe
REM This script builds the demo application using CMake

echo ========================================
echo Building WebGLHost Native Demo Test
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
) else (
    echo [OK] host directory exists
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
) else (
    echo [OK] runtime directory exists
)

echo.

REM Check if build directory exists
if exist build (
    echo Cleaning existing build directory...
    rmdir /s /q build
)

REM Create build directory
mkdir build
cd build

echo.
echo Running CMake...
cmake -G "Visual Studio 16 2019" -A x64 ..

if %ERRORLEVEL% NEQ 0 (
    echo CMake configuration failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo Building demo.exe...
cmake --build . --config Release

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo Executable location: build\bin\Release\demo.exe
echo.

cd ..

REM Copy the executable to the demo root for easier access
echo Copying demo.exe to demo directory...
copy /Y build\bin\Release\demo.exe demo.exe

if %ERRORLEVEL% EQU 0 (
    echo [OK] demo.exe copied successfully
) else (
    echo [WARNING] Failed to copy demo.exe
)

echo.
echo Build complete! You can now run:
echo   scripts\run.bat
echo.

pause

