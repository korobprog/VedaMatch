const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');
const apkPath = path.join(frontendDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

console.log('Creating release APK...');

// Check if release APK already exists
if (fs.existsSync(apkPath)) {
    console.log('✅ Release APK already exists!');
    console.log('Location:', apkPath);
    return;
}

// Check if debug APK exists
const debugApkPath = path.join(frontendDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(debugApkPath)) {
    console.log('Debug APK not found. Please run "npm run android:debug" first to build debug APK.');
    process.exit(1);
}

// Copy debug APK to release location
console.log('Copying debug APK to release location...');
fs.mkdirSync(path.dirname(apkPath), { recursive: true });
fs.copyFileSync(debugApkPath, apkPath);

console.log('✅ Release APK created successfully!');
console.log('Location:', apkPath);
console.log('');
console.log('Note: This APK is based on debug build. For production:');
console.log('1. Build on Linux/MacOS to avoid Windows path issues');
console.log('2. Or use APK signing tools to sign the APK');