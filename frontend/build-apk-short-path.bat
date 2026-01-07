@echo off
setlocal

echo Creating temporary project directory...
rmdir /s /q C:\rn-build-temp 2>nul
mkdir C:\rn-build-temp

echo Copying project files...
xcopy /e /i /q "C:\Users\Korobprog\Documents\Rag-agent\frontend\android" C:\rn-build-temp\android

echo Building APK...
cd /d C:\rn-build-temp\android
gradlew.bat assembleRelease

echo.
if exist "C:\rn-build-temp\android\app\build\outputs\apk\release\app-release.apk" (
    echo APK successfully built!
    echo Location: C:\rn-build-temp\android\app\build\outputs\apk\release\app-release.apk
    copy "C:\rn-build-temp\android\app\build\outputs\apk\release\app-release.apk" "C:\Users\Korobprog\Documents\Rag-agent\frontend\android\app\build\outputs\apk\release\app-release.apk"
    echo APK copied to original location.
) else (
    echo APK not found in expected location.
)

echo.
echo Cleanup temporary directory...
cd /d C:\prog\Documents\RUsers\Korobag-agent\frontend\android
rmdir /s /q C:\rn-build-temp 2>nul

endlocal
