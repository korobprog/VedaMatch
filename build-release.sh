#!/bin/bash

echo "========================================"
echo "Building Android Production APK"
echo "========================================"
echo ""

echo "Step 1: Setup environment..."
cd frontend
cp .env.production .env || { echo "[ERROR] Failed to copy .env.production to .env"; exit 1; }
echo "[OK] Environment configured"
echo ""

echo "Step 2: Create JS bundle..."
ENVFILE=.env.production npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res || { echo "[ERROR] Failed to create JS bundle"; exit 1; }
echo "[OK] Bundle created"
echo ""

echo "Step 3: Build APK..."
cd android
./gradlew clean
./gradlew assembleRelease -x mergeDexRelease || { echo "[ERROR] Failed to build APK"; exit 1; }
echo "[OK] APK built"
echo ""

echo "Step 4: Copy APK to root..."
cd ../..
cp frontend/android/app/build/outputs/apk/release/app-release.apk ragagent-release.apk || { echo "[ERROR] Failed to copy APK"; exit 1; }

echo "========================================"
echo "[SUCCESS] APK build completed!"
echo "Location: ragagent-release.apk"
echo "========================================"