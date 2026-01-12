@echo off
setlocal

REM Set paths
if "%ANDROID_HOME%"=="" set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set ADB=%ANDROID_HOME%\platform-tools\adb.exe
set EMULATOR=%ANDROID_HOME%\emulator\emulator.exe
set AVD_NAME=Medium_Phone_API_36.1

echo [CHECK] Checking for connected devices...
"%ADB%" devices | findstr "emulator-" >nul
if %ERRORLEVEL%==0 (
    echo [OK] Emulator already running.
) else (
    echo [START] Starting emulator %AVD_NAME%...
    start /B "" "%EMULATOR%" -avd %AVD_NAME% -gpu host -accel on
    
    echo [WAIT] Waiting for emulator to boot...
    timeout /t 10 /nobreak >nul
)

echo [SETUP] Setting up reverse port forwarding...
"%ADB%" wait-for-device
"%ADB%" reverse tcp:8081 tcp:8081
"%ADB%" reverse tcp:8082 tcp:8082

echo [DONE] Emulator setup complete.
exit /b 0
