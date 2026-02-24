#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const path = require('path');

const simulator = process.argv[2] || 'iPhone 17 Pro';
const projectPath = path.join(__dirname, 'frontend', 'ios');
const derivedDataPath = `${process.env.HOME}/Library/Developer/Xcode/DerivedData`;

console.log(`\n🔨 Сборка iOS приложения для ${simulator}...`);

try {
    // Находим или получаем UUID симулятора
    const devicesJson = execSync('xcrun simctl list devices --json', { encoding: 'utf-8' });
    const devices = JSON.parse(devicesJson).devices;

    let targetDevice = null;
    for (const runtime in devices) {
        if (runtime.includes('iOS')) {
            const found = devices[runtime].find(d => d.name === simulator && d.isAvailable);
            if (found) {
                targetDevice = found;
                break;
            }
        }
    }

    if (!targetDevice) {
        console.error(`❌ Симулятор "${simulator}" не найден.`);
        process.exit(1);
    }

    console.log(`📱 Целевой симулятор: ${targetDevice.name} (${targetDevice.udid})`);

    // Загружаем симулятор если он выключен
    if (targetDevice.state !== 'Booted') {
        console.log('🔄 Запуск симулятора...');
        try {
            execSync(`xcrun simctl boot "${targetDevice.udid}"`, { stdio: 'pipe' });
        } catch (bootError) {
            if (!bootError.message.includes('Unable to boot device in current state: Booted')) {
                throw bootError;
            }
            console.log('✅ Симулятор уже загружается или загружен.');
        }
    }

    // Открываем приложение Simulator
    spawn('open', ['-a', 'Simulator'], { detached: true, stdio: 'ignore' }).unref();

    // Собираем проект
    console.log('⏳ Компиляция (это может занять несколько минут при первом запуске)...');
    execSync(
        `xcodebuild -workspace vedamatch.xcworkspace -scheme vedamatch -configuration Debug ` +
        `-destination 'platform=iOS Simulator,id=${targetDevice.udid}' ` +
        `-derivedDataPath "${derivedDataPath}/vedamatch-dev" ` +
        `build`,
        { cwd: projectPath, stdio: 'inherit' }
    );

    // Находим собранное приложение
    const appPath = `${derivedDataPath}/vedamatch-dev/Build/Products/Debug-iphonesimulator/vedamatch.app`;

    // Устанавливаем
    console.log('\n📲 Установка приложения в симулятор...');
    execSync(`xcrun simctl install "${targetDevice.udid}" "${appPath}"`, { stdio: 'inherit' });

    // Запускаем
    console.log('🚀 Запуск приложения...');
    execSync(`xcrun simctl launch "${targetDevice.udid}" com.vedicai.vedamatch`, { stdio: 'inherit' });

    console.log('\n✅ Приложение успешно запущено!');
    console.log('💡 Нажмите Cmd+R в симуляторе для перезагрузки JS или Cmd+D для меню разработчика.\n');

} catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
}
