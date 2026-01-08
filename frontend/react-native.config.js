module.exports = {
  project: {
    ios: {},
    android: {
      sourceDir: './android',
      appName: 'app',
      packageName: 'com.ragagent',
    },
  },
  assets: ['./assets/'],
  // Настройка порта Metro bundler
  server: {
    port: 8082,
  },
};
