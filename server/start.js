#!/usr/bin/env node

const { execSync, spawn } = require('child_process');

console.log('🚀 Запуск Rag Agent Server');
console.log('');

// Проверка Go
try {
  execSync('go version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Go не установлен!');
  console.error('Установи Go: https://go.dev/dl/');
  process.exit(1);
}

// Проверка Docker
try {
  execSync('docker --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Docker не установлен!');
  console.error('Установи Docker: https://docs.docker.com/get-docker/');
  process.exit(1);
}

// Переходим в директорию server
const serverDir = __dirname;
process.chdir(serverDir);

// Запуск PostgreSQL
console.log('📦 Запускаю PostgreSQL...');
try {
  // Пробуем docker-compose (старая версия) или docker compose (новая версия)
  try {
    // Запускаем все сервисы в фоне
    execSync('docker-compose up -d', { stdio: 'inherit' });
    // Останавливаем контейнер server, так как мы запускаем его локально
    try { execSync('docker stop rag-agent-server', { stdio: 'ignore' }); } catch (e) { }
  } catch (error) {
    execSync('docker compose up -d', { stdio: 'inherit' });
    try { execSync('docker stop rag-agent-server', { stdio: 'ignore' }); } catch (e) { }
  }
} catch (error) {
  console.error('❌ Ошибка при запуске PostgreSQL');
  process.exit(1);
}

// Ждём пока БД поднимется
console.log('⏳ Жду пока PostgreSQL запустится...');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  await sleep(3000);

  // Установка зависимостей
  console.log('📥 Устанавливаю зависимости Go...');
  try {
    execSync('go mod download', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Ошибка при установке зависимостей');
    process.exit(1);
  }

  // Проверка порта 8000
  const net = require('net');
  const isPortTaken = (port) => new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
  });

  if (await isPortTaken(8000)) {
    console.log('⚠️  Порт 8000 уже занят. Предполагаем, что бэкенд уже запущен.');
    console.log('✅  Пропускаем запуск сервера.');
    process.exit(0);
  }

  // Запуск сервера (ВСЕГДА используем go run в dev-режиме для актуального кода)
  console.log('🔥 Запускаю сервер на http://localhost:8000');
  console.log('');

  const fs = require('fs');
  const serverExePath = serverDir + '/server.exe';
  const mainExePath = serverDir + '/main.exe';

  // Предупреждение о наличии скомпилированных файлов
  if (fs.existsSync(serverExePath) || fs.existsSync(mainExePath)) {
    console.log('⚠️  Найдены скомпилированные файлы (server.exe / main.exe).');
    console.log('   В dev-режиме они НЕ используются — запускаем go run для актуального кода.');
    console.log('   Для production используйте: go build -o server.exe ./cmd/api/main.go');
    console.log('');
  }

  // Всегда используем go run для development
  console.log('📦 Запускаю через go run (dev-режим)');
  const serverProcess = spawn('go', ['run', './cmd/api/main.go'], {
    stdio: 'inherit',
    shell: true,
    cwd: serverDir
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Ошибка при запуске сервера:', error);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Обработка сигналов для корректного завершения
  process.on('SIGINT', () => {
    console.log('\n🛑 Остановка сервера...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Остановка сервера...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });
})();


