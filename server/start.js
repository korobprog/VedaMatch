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
    execSync('docker-compose up -d', { stdio: 'inherit' });
  } catch (error) {
    execSync('docker compose up -d', { stdio: 'inherit' });
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

  // Запуск сервера
  console.log('🔥 Запускаю сервер на http://localhost:8081');
  console.log('');

  const serverProcess = spawn('go', ['run', 'cmd/api/main.go'], {
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


