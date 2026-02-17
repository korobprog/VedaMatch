import {
    getMessaging,
    requestPermission,
    getToken,
    getAPNSToken,
    registerDeviceForRemoteMessages,
    isDeviceRegisteredForRemoteMessages,
    onMessage,
    onNotificationOpenedApp,
    getInitialNotification,
    onTokenRefresh,
    AuthorizationStatus
} from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { navigationRef } from '../navigation/navigationRef';
import { contactService } from './contactService';

// Lazy-loaded messaging instance to prevent initialization race conditions.
let messagingInstance: any = null;
const getMessagingInstance = () => {
    if (!messagingInstance) {
        messagingInstance = getMessaging();
    }
    return messagingInstance;
};

const logPushTelemetry = (event: string, payload: Record<string, any> = {}) => {
    console.log(`[PushTelemetry] ${event}`, payload);
};

const safeParseParams = (raw: any): Record<string, any> => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw !== 'string') return {};

    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const registerTokenOnServer = async (token: string) => {
    if (!token) return;

    const deviceId = await DeviceInfo.getUniqueId();
    const appVersion = DeviceInfo.getVersion();

    await contactService.registerPushToken({
        token,
        provider: 'fcm',
        platform: Platform.OS,
        deviceId,
        appVersion,
    });

    logPushTelemetry('token_registered', {
        platform: Platform.OS,
        hasDeviceId: !!deviceId,
        appVersion,
    });
};

export const notificationService = {
    requestUserPermission: async () => {
        const messaging = getMessagingInstance();
        const authStatus = await requestPermission(messaging);
        const enabled =
            authStatus === AuthorizationStatus.AUTHORIZED ||
            authStatus === AuthorizationStatus.PROVISIONAL;

        logPushTelemetry('permission_status', {
            enabled,
            authStatus,
        });

        return enabled;
    },

    getFcmToken: async () => {
        try {
            const messaging = getMessagingInstance();

            if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(messaging)) {
                await registerDeviceForRemoteMessages(messaging);
            }

            if (Platform.OS === 'ios') {
                const apnsToken = await getAPNSToken(messaging);
                logPushTelemetry('apns_token_state', { hasToken: !!apnsToken });
            }

            const fcmToken = await getToken(messaging);
            if (fcmToken) {
                await AsyncStorage.setItem('pushToken', fcmToken);
                await registerTokenOnServer(fcmToken);
                return fcmToken;
            }
        } catch (error) {
            console.error('[NotificationService] Failed to get FCM token:', error);
            logPushTelemetry('token_register_error', { reason: 'get_token_failed' });
        }
        return null;
    },

    onMessageReceived: (message: any) => {
        console.log('[NotificationService] Foreground message:', message);

        if (message?.notification) {
            Alert.alert(
                message.notification.title || 'Notification',
                message.notification.body || '',
                [
                    {
                        text: 'View',
                        onPress: () => notificationService.handleNotificationAction(message.data)
                    },
                    { text: 'Close', style: 'cancel' }
                ]
            );
        }
    },

    handleNotificationAction: (data: any) => {
        if (!data) return;

        logPushTelemetry('notification_opened', {
            type: data?.type,
            screen: data?.screen,
        });

        if (!navigationRef.isReady()) {
            return;
        }

        const params = safeParseParams(data.params);

        if (data.screen) {
            // @ts-ignore
            navigationRef.navigate(data.screen, params);
            return;
        }

        if (data.type === 'wallet_bonus' || data.type === 'wallet_activated') {
            // @ts-ignore
            navigationRef.navigate('Wallet');
            return;
        }

        if (data.type === 'referral_joined' || data.type === 'referral_activated') {
            // @ts-ignore
            navigationRef.navigate('InviteFriends');
            return;
        }

        if (data.type === 'new_message') {
            const senderRaw = data.senderId || params.senderId;
            const senderId = Number.parseInt(String(senderRaw || ''), 10);
            if (Number.isFinite(senderId) && senderId > 0) {
                // @ts-ignore
                navigationRef.navigate('Chat', { userId: senderId });
            }
            return;
        }

        if (data.type === 'news') {
            // @ts-ignore
            navigationRef.navigate('News');
        }
    },

    handleBackgroundMessage: async (remoteMessage: any) => {
        const data = remoteMessage?.data || {};
        logPushTelemetry('notification_background_received', {
            type: data?.type,
            screen: data?.screen,
        });

        try {
            await AsyncStorage.setItem('lastBackgroundNotification', JSON.stringify({
                receivedAt: Date.now(),
                data,
            }));
        } catch (error) {
            console.error('[NotificationService] Failed to persist background notification:', error);
        }
    },

    setupListeners: () => {
        const messaging = getMessagingInstance();

        const unsubscribeForeground = onMessage(messaging, async remoteMessage => {
            notificationService.onMessageReceived(remoteMessage);
        });

        const unsubscribeOpened = onNotificationOpenedApp(messaging, remoteMessage => {
            notificationService.handleNotificationAction(remoteMessage?.data);
        });

        getInitialNotification(messaging).then(remoteMessage => {
            if (remoteMessage) {
                notificationService.handleNotificationAction(remoteMessage.data);
            }
        });

        const unsubscribeTokenRefresh = onTokenRefresh(messaging, async refreshedToken => {
            if (!refreshedToken) return;

            await AsyncStorage.setItem('pushToken', refreshedToken);
            logPushTelemetry('token_refreshed', { platform: Platform.OS });

            try {
                await registerTokenOnServer(refreshedToken);
            } catch (error) {
                console.error('[NotificationService] Failed to register refreshed token:', error);
                logPushTelemetry('token_register_error', { reason: 'refresh_register_failed' });
            }
        });

        return () => {
            unsubscribeForeground();
            unsubscribeOpened();
            unsubscribeTokenRefresh();
        };
    }
};
