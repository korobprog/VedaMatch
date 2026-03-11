/* eslint-env jest */

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
jest.mock('react-native-pager-view', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  const PagerView = React.forwardRef(({ children, initialPage = 0, onPageSelected, testID, ...rest }, ref) => {
    const [page, setPage] = React.useState(initialPage);

    const applyPage = React.useCallback((nextPage) => {
      setPage(nextPage);
      onPageSelected?.({ nativeEvent: { position: nextPage } });
    }, [onPageSelected]);

    React.useImperativeHandle(ref, () => ({
      setPage: applyPage,
      setPageWithoutAnimation: applyPage,
      setScrollEnabled: jest.fn(),
    }), [applyPage]);

    React.useEffect(() => {
      onPageSelected?.({ nativeEvent: { position: initialPage } });
    }, [initialPage, onPageSelected]);

    const pages = React.Children.toArray(children);
    return React.createElement(
      ReactNative.View,
      { testID: testID || 'mock-pager-view', ...rest },
      pages[page] || null
    );
  });

  return {
    __esModule: true,
    default: PagerView,
  };
});
