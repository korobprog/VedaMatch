#!/usr/bin/env node
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const path = require('path');

const simulator = process.argv[2] || 'iPhone 17 Pro';
const frontendPath = path.join(__dirname, 'frontend');
const projectPath = path.join(frontendPath, 'ios');
const derivedDataPath = `${process.env.HOME}/Library/Developer/Xcode/DerivedData`;
const codegenOutputPath = path.join(projectPath, 'build', 'generated', 'ios');
const reactCodegenHeaderPath = path.join(
    codegenOutputPath,
    'FBReactNativeSpec',
    'FBReactNativeSpec.h'
);

function ensureIOSCodegenArtifacts() {
    console.log('🧬 Подготавливаю React Native iOS codegen...');

    fs.rmSync(codegenOutputPath, { recursive: true, force: true });

    execSync(
        'node node_modules/react-native/scripts/generate-codegen-artifacts.js --path . --targetPlatform ios --outputPath ios',
        { cwd: frontendPath, stdio: 'inherit' }
    );

    if (!fs.existsSync(reactCodegenHeaderPath)) {
        throw new Error(`React Native codegen не создал ${reactCodegenHeaderPath}`);
    }

    console.log('✅ React Native iOS codegen готов.');
}

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

    ensureIOSCodegenArtifacts();

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
    execSync(`xcrun simctl launch "${targetDevice.udid}" com.korobkov.vedamatch`, { stdio: 'inherit' });

    console.log('\n✅ Приложение успешно запущено!');
    console.log('💡 Нажмите Cmd+R в симуляторе для перезагрузки JS или Cmd+D для меню разработчика.\n');

} catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
}
