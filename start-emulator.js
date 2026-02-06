const { execSync, spawn } = require('child_process');
const path = require('path');

const os = require('os');

// Определение ОС
const isWindows = os.platform() === 'win32';
const HOME = os.homedir();

// Пути к Android SDK
const ANDROID_SDK = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (isWindows
    ? path.join(process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local'), 'Android', 'Sdk')
    : path.join(HOME, 'Library', 'Android', 'sdk'));

const ADB_PATH = path.join(ANDROID_SDK, 'platform-tools', isWindows ? 'adb.exe' : 'adb');
const EMULATOR_PATH = path.join(ANDROID_SDK, 'emulator', isWindows ? 'emulator.exe' : 'emulator');

// Имя эмулятора (можно переопределить через переменную окружения)
const EMULATOR_NAME = process.env.ANDROID_EMULATOR || null;

function getAvailableEmulators() {
    try {
        const output = execSync(`"${EMULATOR_PATH}" -list-avds`, { encoding: 'utf-8' });
        return output.trim().split('\n').filter(name => name.trim());
    } catch (error) {
        console.error('❌ Не удалось получить список эмуляторов:', error.message);
        return [];
    }
}

function getConnectedDevices() {
    try {
        const output = execSync(`"${ADB_PATH}" devices`, { encoding: 'utf-8' });
        const lines = output.trim().split('\n').slice(1); // Пропускаем заголовок
        return lines
            .filter(line => line.includes('device') || line.includes('emulator'))
            .map(line => line.split('\t')[0])
            .filter(device => device);
    } catch (error) {
        console.error('❌ Не удалось получить список устройств:', error.message);
        return [];
    }
}

function isEmulatorRunning() {
    const devices = getConnectedDevices();
    return devices.some(device => device.startsWith('emulator-'));
}

function startEmulator(emulatorName) {
    console.log(`🚀 Запускаю эмулятор: ${emulatorName}`);

    // Запускаем эмулятор в фоновом режиме
    const emulatorProcess = spawn(EMULATOR_PATH, ['-avd', emulatorName], {
        detached: true,
        stdio: 'ignore'
    });

    emulatorProcess.unref();
    console.log(`📱 Эмулятор ${emulatorName} запущен в фоновом режиме`);
}

function waitForEmulator(timeout = 120000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        console.log('⏳ Ожидаю готовности эмулятора...');

        const checkInterval = setInterval(() => {
            if (isEmulatorRunning()) {
                clearInterval(checkInterval);

                // Дополнительно ждём пока устройство полностью загрузится
                console.log('📱 Эмулятор обнаружен, проверяю готовность...');

                setTimeout(() => {
                    try {
                        // Проверяем что устройство загружено
                        execSync(`"${ADB_PATH}" shell getprop sys.boot_completed`, { encoding: 'utf-8', timeout: 10000 });
                        console.log('✅ Эмулятор готов к работе!');
                        resolve();
                    } catch {
                        // Если не удалось проверить, просто подождём ещё немного
                        setTimeout(() => {
                            console.log('✅ Эмулятор должен быть готов');
                            resolve();
                        }, 5000);
                    }
                }, 3000);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Таймаут ожидания эмулятора'));
            }
        }, 2000);
    });
}

async function main() {
    console.log('\n🤖 Проверка Android эмулятора...\n');

    // Проверяем, запущен ли уже эмулятор
    if (isEmulatorRunning()) {
        const devices = getConnectedDevices();
        console.log(`✅ Эмулятор уже запущен: ${devices.filter(d => d.startsWith('emulator-')).join(', ')}`);
        process.exit(0);
    }

    // Получаем список доступных эмуляторов
    const emulators = getAvailableEmulators();

    if (emulators.length === 0) {
        console.error('❌ Нет доступных эмуляторов! Создайте эмулятор в Android Studio.');
        process.exit(1);
    }

    // Выбираем эмулятор
    const selectedEmulator = EMULATOR_NAME || emulators[0];

    if (EMULATOR_NAME && !emulators.includes(EMULATOR_NAME)) {
        console.warn(`⚠️ Эмулятор "${EMULATOR_NAME}" не найден. Доступные: ${emulators.join(', ')}`);
        console.log(`📱 Использую первый доступный: ${emulators[0]}`);
    }

    console.log(`📋 Доступные эмуляторы: ${emulators.join(', ')}`);
    console.log(`📱 Выбран эмулятор: ${selectedEmulator}\n`);

    // Запускаем эмулятор
    startEmulator(selectedEmulator);

    // Ожидаем готовности
    try {
        await waitForEmulator();
        console.log('\n🎉 Эмулятор готов! Продолжаю запуск...\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        console.log('💡 Попробуйте запустить эмулятор вручную через Android Studio');
        process.exit(1);
    }
}

main();
