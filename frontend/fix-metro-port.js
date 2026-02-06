#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packagerEnvPath = path.join(__dirname, 'node_modules/.generated/.packager.env');
const launchPackagerPath = path.join(__dirname, 'node_modules/.generated/launchPackager.command');

// Обновляем .packager.env
if (fs.existsSync(packagerEnvPath)) {
  let content = fs.readFileSync(packagerEnvPath, 'utf8');
  content = content.replace(/RCT_METRO_PORT=8082/g, 'RCT_METRO_PORT=8081');
  fs.writeFileSync(packagerEnvPath, content);
  console.log('✅ Обновлён .packager.env: порт восстановлен на 8081');
}

// Обновляем launchPackager.command - всегда перезаписываем с жёстко заданным портом 8081
// Скрипт автоматически обновляет порт перед каждым запуском
const launchPackagerContent = '#!/bin/bash\n\n' +
  '# Обновляем порт перед запуском\n' +
  'cd "$(dirname "$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")")/../../.."\n' +
  'node fix-metro-port.js > /dev/null 2>&1\n\n' +
  'THIS_DIR=$(cd -P "$(dirname "$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")")" && pwd)\n\n' +
  'source "$THIS_DIR/.packager.env"\n' +
  'cd "$PROJECT_ROOT"\n' +
  '# Порт 8081 освобождён (Go сервер переехал на 8000)\n' +
  'export RCT_METRO_PORT=8081\n' +
  '"$REACT_NATIVE_PATH/cli.js" start --port 8081\n\n' +
  'if [[ -z "$CI" ]]; then\n' +
  '  echo "Process terminated. Press <enter> to close the window"\n' +
  '  read -r\n' +
  'fi\n';

if (fs.existsSync(launchPackagerPath)) {
  fs.writeFileSync(launchPackagerPath, launchPackagerContent);
  fs.chmodSync(launchPackagerPath, '755');
  console.log('✅ Обновлён launchPackager.command: порт установлен на 8081');
}

