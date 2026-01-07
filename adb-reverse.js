const { exec } = require('child_process');

const ADB_PATH = 'C:\\Users\\Korobprog\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

function runCommand(command) {
    // Replace 'adb' with the full path if the command starts with 'adb'
    const fullCommand = command.replace(/^adb/, `"${ADB_PATH}"`);
    return new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
            if (error) {
                console.warn(`Warning parsing command "${fullCommand}": ${error.message}`);
                resolve(''); // Resolve with empty to continue
                return;
            }
            resolve(stdout.trim());
        });
    });
}

async function reversePorts() {
    console.log('🔄 Setting up ADB reverse port forwarding...');

    try {
        const devicesOutput = await runCommand('adb devices');
        const lines = devicesOutput.split('\n');
        const devices = [];

        // Parse 'adb devices' output
        // Format:
        // List of devices attached
        // emulator-5554	device
        // XYZ123	device

        for (const line of lines) {
            const trimLine = line.trim();
            if (!trimLine || trimLine.startsWith('List of devices')) continue;

            const parts = trimLine.split(/\s+/);
            if (parts.length >= 2 && parts[1] === 'device') {
                devices.push(parts[0]);
            }
        }

        if (devices.length === 0) {
            console.log('⚠️ No connected devices found. Skipping adb reverse.');
            return;
        }

        for (const device of devices) {
            console.log(`📱 Configuring device: ${device}`);
            // Reverse Server Port (8081)
            await runCommand(`adb -s ${device} reverse tcp:8081 tcp:8081`);
            console.log(`   ✅ Reversed tcp:8081 (Server)`);

            // Reverse Metro Port (8082)
            await runCommand(`adb -s ${device} reverse tcp:8082 tcp:8082`);
            console.log(`   ✅ Reversed tcp:8082 (Metro)`);
        }

        console.log('✨ ADB reverse completed successfully.');

    } catch (err) {
        console.error('❌ Error during adb reverse:', err);
    }
}

reversePorts();
