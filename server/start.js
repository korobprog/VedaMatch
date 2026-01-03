#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const net = require('net');

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

// Переходим в директорию server
const serverDir = __dirname;
process.chdir(serverDir);

// Функция для проверки доступности порта
function checkPort(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// Проверка доступности PostgreSQL
async function checkPostgreSQL() {
  console.log('🔍 Проверяю доступность PostgreSQL на localhost:5435...');
  const isAvailable = await checkPort('localhost', 5435);
  return isAvailable;
}

// Запуск PostgreSQL через Docker
async function startPostgreSQL() {
  // Проверка Docker
  let dockerAvailable = false;
  try {
    execSync('docker --version', { stdio: 'ignore' });
    dockerAvailable = true;
  } catch (error) {
    console.warn('⚠️  Docker не найден или не запущен');
  }

  if (!dockerAvailable) {
    return false;
  }

  // Проверка, работает ли Docker Desktop
  try {
    execSync('docker ps', { stdio: 'ignore' });
  } catch (error) {
    console.warn('⚠️  Docker Desktop не запущен или виртуализация не включена');
    console.warn('   Для включения виртуализации:');
    console.warn('   1. Включите виртуализацию в BIOS/UEFI (Intel VT-x или AMD-V)');
    console.warn('   2. Включите Hyper-V или WSL2 в Windows');
    console.warn('   3. Перезапустите Docker Desktop');
    return false;
  }

  console.log('📦 Запускаю PostgreSQL через Docker...');
  try {
    // Пробуем docker-compose (старая версия) или docker compose (новая версия)
    try {
      execSync('docker-compose up -d', { stdio: 'inherit' });
    } catch (error) {
      execSync('docker compose up -d', { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error('❌ Ошибка при запуске PostgreSQL через Docker');
    return false;
  }
}

// Основная логика запуска
(async () => {
  // Проверяем, доступна ли БД
  const dbAvailable = await checkPostgreSQL();
  
  if (!dbAvailable) {
    // Пытаемся запустить через Docker
    const started = await startPostgreSQL();
    
    if (!started) {
      console.error('');
      console.error('❌ PostgreSQL недоступен и не удалось запустить через Docker');
      console.error('');
      console.error('Возможные решения:');
      console.error('1. Включите виртуализацию в BIOS/UEFI и запустите Docker Desktop');
      console.error('2. Установите PostgreSQL локально и настройте подключение');
      console.error('3. Используйте удалённую БД, задав переменные окружения:');
      console.error('   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
      console.error('');
      process.exit(1);
    }
    
    // Ждём пока БД поднимется
    console.log('⏳ Жду пока PostgreSQL запустится...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем ещё раз
    const dbReady = await checkPostgreSQL();
    if (!dbReady) {
      console.error('❌ PostgreSQL не запустился. Проверьте логи Docker.');
      process.exit(1);
    }
  } else {
    console.log('✅ PostgreSQL уже доступен');
  }

  
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


