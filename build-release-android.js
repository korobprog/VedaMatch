const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendDir = path.join(__dirname, 'frontend');
const androidDir = path.join(frontendDir, 'android');
const buildGradlePath = path.join(frontendDir, 'node_modules', 'react-native-reanimated', 'android', 'build.gradle');
const backupBuildGradlePath = path.join(frontendDir, 'node_modules', 'react-native-reanimated', 'android', 'build.gradle.backup');

console.log('Building Android release...');

// Check if APK already exists
const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (fs.existsSync(apkPath)) {
    console.log('✅ Release APK already exists at:', apkPath);
    console.log('APK location:', apkPath);
    return;
}

// Backup original build.gradle if not exists
if (!fs.existsSync(backupBuildGradlePath)) {
    fs.copyFileSync(buildGradlePath, backupBuildGradlePath);
    console.log('Backup created');
}

// Copy .so files from debug
console.log('Copying native libraries from debug...');
const debugSoDir = path.join(frontendDir, 'node_modules', 'react-native-reanimated', 'android', 'build', 'intermediates', 'cmake', 'debug', 'obj', 'arm64-v8a');
const jniLibsDir = path.join(frontendDir, 'node_modules', 'react-native-reanimated', 'android', 'src', 'main', 'jniLibs', 'arm64-v8a');

if (fs.existsSync(debugSoDir)) {
    if (!fs.existsSync(jniLibsDir)) {
        fs.mkdirSync(jniLibsDir, { recursive: true });
    }
    const files = fs.readdirSync(debugSoDir).filter(f => f.endsWith('.so'));
    files.forEach(file => {
        fs.copyFileSync(path.join(debugSoDir, file), path.join(jniLibsDir, file));
    });
    console.log('Copied native libraries');
} else {
    console.log('Debug .so files not found, building debug APK first...');
    execSync('cd "' + androidDir + '" && ./gradlew.bat assembleDebug', { stdio: 'inherit', shell: true });

    // Retry copying .so files
    if (fs.existsSync(debugSoDir)) {
        if (!fs.existsSync(jniLibsDir)) {
            fs.mkdirSync(jniLibsDir, { recursive: true });
        }
        const files = fs.readdirSync(debugSoDir).filter(f => f.endsWith('.so'));
        files.forEach(file => {
            fs.copyFileSync(path.join(debugSoDir, file), path.join(jniLibsDir, file));
        });
        console.log('Copied native libraries');
    } else {
        console.error('Failed to find debug .so files');
        process.exit(1);
    }
}

// Patch build.gradle to skip native build for release
console.log('Patching build.gradle...');
let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

// Remove externalNativeBuild from release block
buildGradleContent = buildGradleContent.replace(
    /release\s*\{[\s\S]*?externalNativeBuild[\s\S]*?cmake\s*\{[\s\S]*?\}\s*\}/g,
    'release {\n            // Skip native build for release - use precompiled libraries\n        }'
);

fs.writeFileSync(buildGradlePath, buildGradleContent);
console.log('Patched');

try {
    // Clean and build release
    console.log('\n🔨 Building release APK...');
    execSync('gradlew.bat clean', { cwd: androidDir, stdio: 'inherit', shell: true });

    execSync('gradlew.bat assembleRelease', { cwd: androidDir, stdio: 'inherit', shell: true });

    console.log('\n✅ Build completed successfully!');
    console.log(`APK location: ${apkPath}`);
} catch (error) {
    console.error('\n❌ Build failed');
    console.error(error.message);
    process.exit(1);
} finally {
    // Restore original build.gradle
    if (fs.existsSync(backupBuildGradlePath)) {
        fs.copyFileSync(backupBuildGradlePath, buildGradlePath);
        console.log('Restored original build.gradle');
    }
}