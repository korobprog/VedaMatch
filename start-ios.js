const { execSync, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

function main() {
    console.log('\n🍎 Проверка iOS Simulator...\n');

    if (os.platform() !== 'darwin') {
        console.error('❌ Ошибка: Запуск iOS Simulator возможен только на macOS.');
        console.log('💡 Если вы используете Windows, вам нужен Mac (локально или удаленно) или сервис типа Appetize.io.');
        console.log('💡 Также убедитесь, что в папке frontend/ios есть проект (сейчас папка отсутствует).');
        process.exit(1);
    }

    // Проверяем наличие папки ios
    const iosPath = path.join(__dirname, 'frontend', 'ios');
    if (!fs.existsSync(iosPath)) {
        console.warn('⚠️ Предупреждение: Папка "frontend/ios" не найдена.');
        console.log('💡 Вероятно, проект еще не инициализирован для iOS.');
        console.log('💡 Попробуйте запустить: npx react-native init <ProjectName> (только если вы знаете что делаете)');
    }

    try {
        // Проверяем наличие Xcode и simctl
        execSync('xcrun --version', { stdio: 'ignore' });
    } catch (e) {
        console.error('❌ Ошибка: Xcode не установлен или не настроен CLI (xcrun).');
        process.exit(1);
    }

    try {
        console.log('🚀 Открываю Simulator...');
        // Запускаем Simulator.app
        const simulatorProcess = spawn('open', ['-a', 'Simulator'], {
            detached: true,
            stdio: 'ignore'
        });
        simulatorProcess.unref();

        console.log('⏳ Ожидаю загрузки списка устройств...');

        // Даем Simulator.app немного времени на запуск если он был закрыт
        setTimeout(() => {
            try {
                const devicesOutput = execSync('xcrun simctl list devices --json', { encoding: 'utf-8' });
                const devices = JSON.parse(devicesOutput).devices;

                let targetDevice = null;
                let availableDevices = [];

                // Проходим по всем рантаймам и ищем доступные симуляторы iOS
                for (const runtime in devices) {
                    if (runtime.includes('iOS')) {
                        devices[runtime].forEach(device => {
                            if (device.isAvailable) {
                                availableDevices.push(device);
                                if (device.state === 'Booted') {
                                    targetDevice = device;
                                }
                            }
                        });
                    }
                }

                if (targetDevice) {
                    console.log(`✅ Симулятор уже запущен: ${targetDevice.name} (${targetDevice.udid})`);
                } else if (availableDevices.length > 0) {
                    // Выбираем самый новый iPhone из списка
                    // (Обычно они отсортированы, но для надежности просто берем последний доступный)
                    targetDevice = availableDevices[availableDevices.length - 1];
                    console.log(`📱 Запускаю ${targetDevice.name} (${targetDevice.udid})...`);
                    execSync(`xcrun simctl boot ${targetDevice.udid}`);
                } else {
                    console.error('❌ Доступные iOS симуляторы не найдены.');
                    process.exit(1);
                }

                console.log('\n🎉 iOS Simulator готов! Продолжаю запуск...\n');
                process.exit(0);
            } catch (error) {
                console.error('\n❌ Ошибка при получении списка устройств:', error.message);
                process.exit(1);
            }
        }, 2000);
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

main();
