#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Сначала запускаем fix-metro-port.js
try {
  require('./fix-metro-port.js');
} catch (error) {
  console.error('Error running fix-metro-port.js:', error);
}

// Устанавливаем переменные окружения
process.env.PORT = '8082';
process.env.REACT_NATIVE_PACKAGER_PORT = '8082';
process.env.RCT_METRO_PORT = '8082';

// Запускаем Metro bundler
const { spawn } = require('child_process');

// Pass any arguments from the command line (like --reset-cache) to the react-native start command
const args = process.argv.slice(2);
const metro = spawn('npx', ['react-native', 'start', ...args], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: '8082',
    REACT_NATIVE_PACKAGER_PORT: '8082',
    RCT_METRO_PORT: '8082'
  }
});

metro.on('error', (error) => {
  console.error('Failed to start Metro:', error);
  process.exit(1);
});

metro.on('exit', (code) => {
  process.exit(code || 0);
});

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
  metro.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  metro.kill('SIGTERM');
  process.exit(0);
});

