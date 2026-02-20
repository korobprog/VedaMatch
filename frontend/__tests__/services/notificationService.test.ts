import { Alert } from 'react-native';

const mockNavigate = jest.fn();
const mockIsReady = jest.fn(() => true);

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  requestPermission: jest.fn(),
  getToken: jest.fn(),
  getAPNSToken: jest.fn(),
  registerDeviceForRemoteMessages: jest.fn(),
  isDeviceRegisteredForRemoteMessages: jest.fn(() => true),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  onTokenRefresh: jest.fn(() => jest.fn()),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => 'test-device'),
  getVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockIsReady(),
    navigate: (...args: any[]) => mockNavigate(...args),
  },
}));

jest.mock('../../services/contactService', () => ({
  contactService: {
    registerPushToken: jest.fn(),
  },
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const { notificationService } = require('../../services/notificationService');

describe('notificationService video circle publish push', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsReady.mockReturnValue(true);
  });

  it('navigates to VideoCirclesScreen for video_circle_publish_result action', () => {
    notificationService.handleNotificationAction({
      type: 'video_circle_publish_result',
      status: 'success',
      circleId: '77',
    });

    expect(mockNavigate).toHaveBeenCalledWith('VideoCirclesScreen');
  });

  it('shows foreground alert for publish result and opens circles on View', () => {
    notificationService.onMessageReceived({
      data: {
        type: 'video_circle_publish_result',
        status: 'failed',
      },
    });

    expect(Alert.alert).toHaveBeenCalled();
    const [, , actions] = (Alert.alert as jest.Mock).mock.calls[0];
    actions[0].onPress();

    expect(mockNavigate).toHaveBeenCalledWith('VideoCirclesScreen');
  });

  it('routes room_message payload to RoomChat', () => {
    notificationService.handleNotificationAction({
      type: 'room_message',
      roomId: '42',
      roomName: 'Bhakti Circle',
    });

    expect(mockNavigate).toHaveBeenCalledWith('RoomChat', {
      roomId: 42,
      roomName: 'Bhakti Circle',
    });
  });

  it('routes explicit RoomChat screen payload with params', () => {
    notificationService.handleNotificationAction({
      type: 'room_message',
      screen: 'RoomChat',
      params: JSON.stringify({ roomId: 99, roomName: 'Japa' }),
    });

    expect(mockNavigate).toHaveBeenCalledWith('RoomChat', {
      roomId: 99,
      roomName: 'Japa',
    });
  });

  it('routes yatra approval payload to YatraDetail', () => {
    notificationService.handleNotificationAction({
      type: 'yatra_join_approved',
      yatraId: '51',
    });

    expect(mockNavigate).toHaveBeenCalledWith('YatraDetail', { yatraId: 51 });
  });

  it('routes yatra broadcast payload with roomId to RoomChat', () => {
    notificationService.handleNotificationAction({
      type: 'yatra_broadcast',
      yatraId: '51',
      roomId: '33',
      roomName: 'Mayapur Yatra',
    });

    expect(mockNavigate).toHaveBeenCalledWith('RoomChat', {
      roomId: 33,
      roomName: 'Mayapur Yatra',
      isYatraChat: true,
    });
  });
});
