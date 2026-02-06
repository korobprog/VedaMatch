const { execSync } = require('child_process');
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

const installCmd = `${gradlew} app:installDebug -PreactNativeDevServerPort=8081`;

console.log(`🏗️ Building and installing app on Android...`);
console.log(`📂 cwd: ${androidDir}`);
console.log(`👉 cmd: ${installCmd}`);

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

try {
  execSync(installCmd, { cwd: androidDir, stdio: 'inherit', env });
} catch (error) {
  console.error('❌ Build failed. Please check the logs.');
  process.exit(1);
}

// 3. Launch App
const packageName = 'com.ragagent';
const activity = '.MainActivity';

console.log(`🚀 Launching ${packageName}/${activity}...`);
try {
  execSync(`"${ADB_PATH}" shell am start -n ${packageName}/${activity}`, { stdio: 'inherit' });
  console.log('✅ App launched successfully!');
} catch (error) {
  console.error('❌ Failed to launch app.');
  process.exit(1);
}
