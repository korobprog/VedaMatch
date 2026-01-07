@echo off
echo ========================================
echo Building Android Production APK
echo ========================================
echo.

echo Step 1: Setup environment...
cd frontend
copy /Y .env.production .env >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy .env.production to .env
    pause
    exit /b 1
)
echo [OK] Environment configured
echo.

echo Step 2: Create JS bundle...
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create JS bundle
    pause
    exit /b 1
)
echo [OK] Bundle created
echo.

echo Step 3: Build APK...
cd android
gradlew.bat clean
gradlew.bat assembleRelease -x mergeDexRelease
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build APK
    pause
    exit /b 1
)
echo [OK] APK built
echo.

echo Step 4: Copy APK to root...
cd ..\..
copy /Y frontend\android\app\build\outputs\apk\release\app-release.apk ragagent-release.apk >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy APK
    pause
    exit /b 1
)

echo ========================================
echo [SUCCESS] APK build completed!
echo Location: ragagent-release.apk
echo ========================================
pause