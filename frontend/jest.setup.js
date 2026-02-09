jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:8000/api',
  APP_ENV: 'test',
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-webrtc', () => ({
  mediaDevices: { getUserMedia: jest.fn() },
  RTCPeerConnection: jest.fn(),
  RTCIceCandidate: jest.fn(),
  RTCSessionDescription: jest.fn(),
}));
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  types: {},
}));
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));
jest.mock('react-native-audio-recorder-player', () => jest.fn().mockImplementation(() => ({
  startRecorder: jest.fn(),
  stopRecorder: jest.fn(),
})));
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  exists: jest.fn().mockResolvedValue(false),
  DocumentDirectoryPath: '/tmp',
}));
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn().mockResolvedValue(''),
}));
