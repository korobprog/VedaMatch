@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Настройка путей для Windows
if "%ANDROID_HOME%"=="" set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set ANDROID_SDK_ROOT=%ANDROID_HOME%
set PATH=%PATH%;%ANDROID_HOME%\emulator;%ANDROID_HOME%\platform-tools

REM Проверяем, есть ли уже запущенный эмулятор (не физическое устройство)
for /f "tokens=1" %%a in ('adb devices 2^>nul ^| findstr /r "^emulator-"') do (
    set EMULATOR_DEVICE=%%a
    for /f "delims=" %%b in ('adb -s !EMULATOR_DEVICE! shell getprop sys.boot_completed 2^>nul ^| findstr /r "[0-9]"') do (
        if "%%b"=="1" (
            echo [OK] Emulator !EMULATOR_DEVICE! is already running and ready
            echo [OK] Setting up port forwarding...
            adb -s !EMULATOR_DEVICE! reverse tcp:8081 tcp:8081
            adb -s !EMULATOR_DEVICE! reverse tcp:8082 tcp:8082
            exit /b 0
        )
    )
)

REM Запускаем эмулятор с аппаратным ускорением GPU
echo [START] Starting emulator ragagent_emulator (Hardware GPU)...
start /B "" "%ANDROID_HOME%\emulator\emulator.exe" -avd ragagent_emulator -no-snapshot-load -gpu host -no-audio -no-boot-anim -accel on

echo [WAIT] Waiting for Android OS to boot (up to 5 minutes)...
set MAX_ATTEMPTS=100
set ATTEMPT=0

:wait_loop
set /a ATTEMPT+=1
if %ATTEMPT% gtr %MAX_ATTEMPTS% (
    echo.
    echo [ERROR] Emulator did not boot in the allocated time.
    exit /b 1
)

timeout /t 3 /nobreak >nul

REM Проверяем завершение загрузки системы
for /f "delims=" %%a in ('adb shell getprop sys.boot_completed 2^>nul ^| findstr /r "[0-9]"') do (
    if "%%a"=="1" (
        echo.
        echo [OK] Emulator is fully loaded and ready!
        echo [OK] Setting up port forwarding...
        adb reverse tcp:8081 tcp:8081
        adb reverse tcp:8082 tcp:8082
        exit /b 0
    )
)

<nul set /p "=."
goto wait_loop
