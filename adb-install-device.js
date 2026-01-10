/**
 * Script to install and launch the app on a USB-connected physical device.
 * Handles the case when multiple devices (emulator + USB) are connected.
 */

const { exec, spawn } = require('child_process');
const path = require('path');

const ADB_PATH = 'C:\\Users\\Korobprog\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

function runCommand(command) {
    const fullCommand = command.replace(/^adb/, `"${ADB_PATH}"`);
    return new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

function runGradle(deviceSerial) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔨 Building and installing app on device: ${deviceSerial}...`);

        const gradleProcess = spawn('cmd.exe', ['/c', 'gradlew.bat', 'app:installDebug', '-PreactNativeDevServerPort=8082'], {
            cwd: path.join(__dirname, 'frontend', 'android'),
            stdio: 'inherit',
            env: {
                ...process.env,
                ANDROID_SERIAL: deviceSerial  // This tells gradle which device to use
            }
        });

        gradleProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Gradle exited with code ${code}`));
            }
        });

        gradleProcess.on('error', (err) => {
            reject(err);
        });
    });
}

async function getPhysicalDevice() {
    const devicesOutput = await runCommand('adb devices');
    const lines = devicesOutput.split('\n');
    const devices = [];

    for (const line of lines) {
        const trimLine = line.trim();
        if (!trimLine || trimLine.startsWith('List of devices')) continue;

        const parts = trimLine.split(/\s+/);
        if (parts.length >= 2 && parts[1] === 'device') {
            devices.push(parts[0]);
        }
    }

    // Filter out emulators (they start with 'emulator-')
    const physicalDevices = devices.filter(d => !d.startsWith('emulator-'));

    if (physicalDevices.length === 0) {
        // If no physical devices, try to use the first available device
        if (devices.length > 0) {
            console.log(`⚠️ No physical USB device found. Using first available: ${devices[0]}`);
            return devices[0];
        }
        return null;
    }

    if (physicalDevices.length > 1) {
        console.log(`ℹ️ Multiple physical devices found: ${physicalDevices.join(', ')}`);
        console.log(`   Using first one: ${physicalDevices[0]}`);
    }

    return physicalDevices[0];
}

async function main() {
    try {
        console.log('📱 Looking for USB-connected device...\n');

        const deviceSerial = await getPhysicalDevice();

        if (!deviceSerial) {
            console.error('❌ No devices found. Please connect a device via USB.');
            process.exit(1);
        }

        console.log(`✅ Found device: ${deviceSerial}\n`);

        // Set up adb reverse for this specific device
        console.log('🔄 Setting up port forwarding...');
        await runCommand(`adb -s ${deviceSerial} reverse tcp:8081 tcp:8081`);
        console.log('   ✅ Reversed tcp:8081 (Server)');
        await runCommand(`adb -s ${deviceSerial} reverse tcp:8082 tcp:8082`);
        console.log('   ✅ Reversed tcp:8082 (Metro)');

        // Run fix-metro-port.js
        console.log('\n⚙️ Running fix-metro-port.js...');
        await new Promise((resolve, reject) => {
            exec('node fix-metro-port.js', { cwd: path.join(__dirname, 'frontend') }, (error) => {
                if (error) {
                    console.warn(`   ⚠️ fix-metro-port.js warning: ${error.message}`);
                }
                resolve();
            });
        });
        console.log('   ✅ Metro port configured');

        // Build and install
        await runGradle(deviceSerial);

        // Launch the app
        console.log('\n🚀 Launching app...');
        await runCommand(`adb -s ${deviceSerial} shell am start -n com.ragagent/.MainActivity`);
        console.log('✨ App launched successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

main();
