@echo off
setlocal
echo ===================================================
echo   Building Release with Short Path (Workaround)
echo ===================================================

REM 1. Set Android SDK paths explicitly
set "ANDROID_HOME=C:\Users\Korobprog\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\Korobprog\AppData\Local\Android\Sdk"
set "PATH=%PATH%;%ANDROID_HOME%\platform-tools"

REM 2. Define folder and drive
set "PROJECT_DIR=C:\Users\Korobprog\Documents\Rag-agent"
set "DRIVE_LETTER=W:"

REM 3. Unmap if exists (cleanup)
if exist %DRIVE_LETTER%\ (
    echo Unmapping existing %DRIVE_LETTER%...
    subst %DRIVE_LETTER% /d
)

REM 4. Map Drive
echo Mapping %PROJECT_DIR% to %DRIVE_LETTER%...
subst %DRIVE_LETTER% "%PROJECT_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to map virtual drive. Maybe %DRIVE_LETTER% is taken.
    goto :error
)

REM 5. Run Build
echo Changing directory to %DRIVE_LETTER%\frontend\android...
pushd %DRIVE_LETTER%\frontend\android

echo Creating local.properties...
echo sdk.dir=C\:\\Users\\Korobprog\\AppData\\Local\\Android\\Sdk > local.properties

echo Cleaning build...
call gradlew.bat clean
if errorlevel 1 goto :build_error

echo Running assembleRelease...
call gradlew.bat assembleRelease --info > build_log.txt 2>&1
if errorlevel 1 (
    type build_log.txt
    goto :build_error
)

echo Copying APK to original location...
if not exist "%PROJECT_DIR%\frontend\android\app\build\outputs\apk\release" mkdir "%PROJECT_DIR%\frontend\android\app\build\outputs\apk\release"
copy "%DRIVE_LETTER%\frontend\android\app\build\outputs\apk\release\app-release.apk" "%PROJECT_DIR%\frontend\android\app\build\outputs\apk\release\app-release.apk"

popd
goto :cleanup

:build_error
echo [ERROR] Build failed. See build_log.txt for details.
popd
goto :cleanup_error

:cleanup
echo Unmapping %DRIVE_LETTER%...
subst %DRIVE_LETTER% /d
echo [SUCCESS] Build finished successfully through virtual drive.
goto :end

:cleanup_error
echo Unmapping %DRIVE_LETTER%...
subst %DRIVE_LETTER% /d
:error
echo [FAIL] Build failed or setup failed.
exit /b 1

:end
endlocal
