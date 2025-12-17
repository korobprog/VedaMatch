const {getDefaultConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Используем порт 8082 для Metro bundler (8081 занят Go сервером)
config.server = {
  ...config.server,
  port: 8082,
};

module.exports = config;

