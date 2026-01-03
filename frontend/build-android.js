#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const platform = os.platform();
const androidDir = path.join(__dirname, 'android');
const buildType = process.argv[2] || 'release'; // 'debug' or 'release'

// Определяем команду для Gradle
let gradleCommand;
const gradlewBat = path.join(androidDir, 'gradlew.bat');
const gradlew = path.join(androidDir, 'gradlew');

if (platform === 'win32') {
  if (fs.existsSync(gradlewBat)) {
    gradleCommand = 'gradlew.bat';
  } else {
    console.error('❌ gradlew.bat not found in android directory');
    console.error('Please ensure gradlew.bat exists in frontend/android/');
    process.exit(1);
  }
} else {
  gradleCommand = './gradlew';
}

const buildTypeCapitalized = buildType.charAt(0).toUpperCase() + buildType.slice(1);

console.log(`Building Android ${buildType}...`);
console.log(`Platform: ${platform}`);
console.log(`Using: ${gradleCommand}`);
console.log(`Working directory: ${androidDir}\n`);

try {
  // Clean
  console.log('🧹 Cleaning...');
  execSync(`${gradleCommand} clean`, { 
    stdio: 'inherit',
    cwd: androidDir,
    shell: true
  });

  // Build
  console.log(`\n🔨 Building ${buildType}...`);
  execSync(`${gradleCommand} assemble${buildTypeCapitalized}`, { 
    stdio: 'inherit',
    cwd: androidDir,
    shell: true
  });

  console.log(`\n✅ Build completed successfully!`);
  console.log(`APK location: ${path.join(androidDir, 'app', 'build', 'outputs', 'apk', buildType, 'app-' + buildType + '.apk')}`);
} catch (error) {
  console.error(`\n❌ Build failed`);
  process.exit(1);
}

