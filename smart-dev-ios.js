#!/usr/bin/env node

/**
 * Smart iOS Development Launcher
 * - Detects if backend/metro are already running
 * - If running: just launches iOS app
 * - If not running: starts full environment
 */

const { spawn, execSync } = require('child_process');
const net = require('net');

const BACKEND_PORT = 8000;
const METRO_PORT = 8081;

// Check if a port is in use (by trying to connect to it)
const isPortInUse = (port) => new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
});

async function main() {
    console.log('🍎 Smart iOS Development Launcher');
    console.log('');

    // Set iOS environment
    console.log('📋 Настраиваю iOS окружение (.env.ios)...');
    try {
        execSync('cd frontend && cp .env.ios .env', { stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Не удалось настроить окружение');
        process.exit(1);
    }

    // Start iOS Simulator
    console.log('');
    console.log('📱 Запускаю iOS Simulator...');
    try {
        execSync('node start-ios.js', { stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Не удалось запустить симулятор');
        process.exit(1);
    }

    // Check what's already running
    const backendRunning = await isPortInUse(BACKEND_PORT);
    const metroRunning = await isPortInUse(METRO_PORT);

    console.log('');
    console.log('🔍 Проверка запущенных сервисов:');
    console.log(`   Backend (${BACKEND_PORT}): ${backendRunning ? '✅ Работает' : '❌ Не запущен'}`);
    console.log(`   Metro (${METRO_PORT}): ${metroRunning ? '✅ Работает' : '❌ Не запущен'}`);
    console.log('');

    if (backendRunning && metroRunning) {
        // Everything is running - just launch iOS
        console.log('🎯 Сервисы уже запущены! Просто запускаю iOS приложение...');
        console.log('');

        const iosProcess = spawn('pnpm', ['run', 'ios'], {
            stdio: 'inherit',
            shell: true
        });

        iosProcess.on('exit', (code) => {
            if (code === 0) {
                console.log('');
                console.log('🎉 iOS приложение успешно запущено!');
                console.log('💡 Нажмите Cmd+R в симуляторе для перезагрузки.');
            }
            process.exit(code || 0);
        });

    } else {
        // Need to start services
        console.log('🚀 Запускаю полное окружение разработки...');
        console.log('');

        // Build the concurrently command based on what's needed
        const tasks = [];
        const names = [];
        const colors = [];

        if (!backendRunning) {
            tasks.push('pnpm run server');
            names.push('SERVER');
            colors.push('blue');
        }

        // Always add admin (it has smart launcher)
        tasks.push(`wait-on tcp:${BACKEND_PORT} && node start-admin.js`);
        names.push('ADMIN');
        colors.push('yellow');

        if (!metroRunning) {
            tasks.push(`wait-on tcp:${BACKEND_PORT} && pnpm run frontend`);
            names.push('METRO');
            colors.push('magenta');
        }

        // iOS waits for metro
        tasks.push(`wait-on tcp:${METRO_PORT} && pnpm run ios`);
        names.push('IOS');
        colors.push('green');

        const taskArgs = tasks.map(t => `"${t}"`).join(' ');
        const cmd = `npx concurrently ${taskArgs} --names "${names.join(',')}" --prefix-colors "${colors.join(',')}" --kill-others-on-fail`;

        console.log('📦 Команда:', cmd);
        console.log('');

        const concurrentProcess = spawn(cmd, [], {
            stdio: 'inherit',
            shell: true
        });

        concurrentProcess.on('exit', (code) => {
            process.exit(code || 0);
        });
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Остановка...');
    process.exit(0);
});

main().catch((err) => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
});
