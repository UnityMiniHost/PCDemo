@echo off
REM Clean script - removes all build artifacts and dependencies

echo ========================================
echo Cleaning WebGLHost Native Demo
echo ========================================

cd /d %~dp0\..

REM Remove build directory
if exist build (
    echo Removing build directory...
    rmdir /s /q build
    echo [OK] build directory removed
)

REM Remove executable
if exist demo.exe (
    echo Removing demo.exe...
    del /q demo.exe
    echo [OK] demo.exe removed
)

REM Remove DLL
if exist host\webglhost_export.dll (
    echo Removing host\webglhost_export.dll...
    del /q host\webglhost_export.dll
    echo [OK] DLL removed
)

REM Remove runtime (optional - ask user)
if exist runtime (
    echo.
    set /p "REMOVE_RUNTIME=Remove runtime directory? (y/n): "
    if /i "%REMOVE_RUNTIME%"=="y" (
        echo Removing runtime...
        rmdir /s /q runtime
        echo [OK] runtime removed
    ) else (
        echo [SKIP] Keeping runtime
    )
)

REM Keep logs by default (optional - ask user)
if exist logs (
    echo.
    set /p "REMOVE_LOGS=Remove logs directory? (y/n): "
    if /i "%REMOVE_LOGS%"=="y" (
        echo Removing logs...
        rmdir /s /q logs
        echo [OK] logs removed
    ) else (
        echo [SKIP] Keeping logs
    )
)

echo.
echo ========================================
echo Clean Complete!
echo ========================================
echo.

pause

