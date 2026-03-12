const { execSync, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

// Detect OS
const isWindows = os.platform() === 'win32';
const HOME = os.homedir();

// Determine Android SDK path
const ANDROID_SDK = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (isWindows
  ? path.join(process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local'), 'Android', 'Sdk')
  : path.join(HOME, 'Library', 'Android', 'sdk'));

// Determine ADB path
const ADB_PATH = path.join(ANDROID_SDK, 'platform-tools', isWindows ? 'adb.exe' : 'adb');
const startEmulatorScript = path.join(__dirname, '..', 'start-emulator.js');

const packageName = 'com.ragagent';
const activity = '.MainActivity';

console.log('🔧 Initializing Android run sequence...');

// 1. Run fix-metro-port.js
try {
  console.log('🔧 Running fix-metro-port.js...');
  // We execute it as a child process to ensure clean environment or just require it
  // require('./fix-metro-port.js') might work if it doesn't have side effects preventing return
  // But checking fix-metro.js, it runs immediately.
  execSync('node fix-metro-port.js', { cwd: __dirname, stdio: 'inherit' });
} catch (e) {
  console.error('⚠️ Warning: fix-metro-port.js failed', e.message);
}

function getConnectedDevices() {
  try {
    const output = execSync(`"${ADB_PATH}" devices`, { encoding: 'utf-8', env });
    return output
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => /\sdevice$/.test(line))
      .map((line) => line.split(/\s+/)[0]);
  } catch (error) {
    console.error('⚠️ Failed to read adb devices:', error.message);
    return [];
  }
}

function pickAndroidTarget(devices) {
  return devices.find((device) => device.startsWith('emulator-')) || devices[0] || null;
}

function ensureAndroidTarget() {
  const devices = getConnectedDevices();
  const selectedExistingTarget = pickAndroidTarget(devices);
  if (devices.length > 0) {
    console.log(`📱 Found Android targets: ${devices.join(', ')}`);
    console.log(`🎯 Selected Android target: ${selectedExistingTarget}`);
    return selectedExistingTarget;
  }

  console.log('📭 No Android devices detected. Starting emulator...');
  const result = spawnSync('node', [startEmulatorScript], {
    cwd: __dirname,
    env,
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('❌ Failed to start Android emulator.');
    process.exit(result.status || 1);
  }

  const startedDevices = getConnectedDevices();
  if (startedDevices.length === 0) {
    console.error('❌ Emulator script finished, but no Android target is available.');
    process.exit(1);
  }

  const selectedStartedTarget = pickAndroidTarget(startedDevices);
  console.log(`✅ Android targets ready: ${startedDevices.join(', ')}`);
  console.log(`🎯 Selected Android target: ${selectedStartedTarget}`);
  return selectedStartedTarget;
}

// 2. Build & Install
const androidDir = path.join(__dirname, 'android');
const gradlew = isWindows ? 'gradlew.bat' : './gradlew';
// Ensure executable permission on Mac/Linux
if (!isWindows) {
  try {
    execSync(`chmod +x ${path.join(androidDir, 'gradlew')}`);
  } catch (e) {
    // ignore
  }
}

const installArgs = ['app:installDebug', '-PreactNativeDevServerPort=8081'];

console.log(`🏗️ Building and installing app on Android...`);
console.log(`📂 cwd: ${androidDir}`);
console.log(`👉 cmd: ${gradlew} ${installArgs.join(' ')}`);

// Set JAVA_HOME if on macOS and it exists
let env = { ...process.env };
if (os.platform() === 'darwin') {
  const potentialJavaHome = '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
  try {
    if (require('fs').existsSync(potentialJavaHome)) {
      console.log(`☕ Setting JAVA_HOME to ${potentialJavaHome}`);
      env.JAVA_HOME = potentialJavaHome;
    }
  } catch (e) { }
}

const targetDevice = ensureAndroidTarget();
if (targetDevice) {
  env.ANDROID_SERIAL = targetDevice;
}

function runGradleInstall() {
  const result = spawnSync(gradlew, installArgs, {
    cwd: androidDir,
    env,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

function tryUninstallConflictingDebugBuild() {
  try {
    console.log(`🧹 Removing conflicting app build from ${targetDevice}: ${packageName}`);
    execSync(`"${ADB_PATH}" -s ${targetDevice} uninstall ${packageName}`, { stdio: 'inherit', env });
    return true;
  } catch (error) {
    console.error('❌ Failed to remove conflicting app build.');
    return false;
  }
}

const firstInstall = runGradleInstall();
const firstOutput = `${firstInstall.stdout || ''}\n${firstInstall.stderr || ''}`;
const hasSignatureConflict = firstOutput.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE');

if (firstInstall.status !== 0) {
  if (hasSignatureConflict) {
    console.warn('⚠️ Existing app signature does not match debug build. Retrying after uninstall...');
    const removed = tryUninstallConflictingDebugBuild();

    if (removed) {
      const retryInstall = runGradleInstall();
      if (retryInstall.status !== 0) {
        console.error('❌ Build failed after removing conflicting app build.');
        process.exit(retryInstall.status || 1);
      }
    } else {
      process.exit(firstInstall.status || 1);
    }
  } else {
    console.error('❌ Build failed. Please check the logs.');
    process.exit(firstInstall.status || 1);
  }
}

// 3. Launch App
console.log(`🚀 Launching ${packageName}/${activity}...`);
try {
  execSync(`"${ADB_PATH}" -s ${targetDevice} shell am start -n ${packageName}/${activity}`, { stdio: 'inherit', env });
  console.log('✅ App launched successfully!');
} catch (error) {
  console.error('❌ Failed to launch app.');
  process.exit(1);
}
