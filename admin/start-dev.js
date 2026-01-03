#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Находим executable Next.js напрямую
const nextBin = path.join(__dirname, 'node_modules', '.bin', 'next.cmd');
const nextJs = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

let cmd, args;

// Проверяем наличие Next.js в node_modules
if (fs.existsSync(nextBin)) {
  // Windows: используем .cmd файл
  cmd = nextBin;
  args = ['dev', '--port', '3005'];
} else if (fs.existsSync(nextJs)) {
  // Используем node для запуска Next.js
  cmd = 'node';
  args = [nextJs, 'dev', '--port', '3005'];
} else {
  console.error('❌ Next.js не найден. Запустите: pnpm install');
  process.exit(1);
}

console.log(`🚀 Запускаем admin на порту 3005...`);

// Запускаем Next.js
const next = spawn(cmd, args, {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

next.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
  process.exit(1);
});

next.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  next.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  next.kill('SIGTERM');
  process.exit(0);
});

