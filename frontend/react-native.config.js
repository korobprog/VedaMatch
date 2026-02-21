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
  dependencies: {
    // Temporarily disable LiveKit Android native modules for local installDebug smoke runs.
    '@livekit/react-native': {
      platforms: {
        android: {},
      },
    },
    'react-native-webrtc': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    '@livekit/react-native-webrtc': {
      platforms: {
        android: {},
      },
    },
  },
};
