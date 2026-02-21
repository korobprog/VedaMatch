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
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { navigationRef } from '../navigation/navigationRef';
import { contactService } from './contactService';
import { serializeAndroidPermissionRequest } from '../utils/permissionRequestQueue';

// External addNotification hook — wired at runtime from NotificationProvider
type AddNotificationFn = (notif: { type: string; title: string; body: string; data: Record<string, any> }) => void;
let _addNotification: AddNotificationFn | null = null;
export const setNotificationAdder = (fn: AddNotificationFn) => { _addNotification = fn; };

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

const getVideoCirclePublishCopy = (data: any) => {
    const status = String(data?.status || '').toLowerCase();
    if (status === 'success') {
        return {
            title: 'Видео опубликовано',
            body: 'Ваш кружок опубликован и появился в ленте.',
        };
    }
    return {
        title: 'Публикация не выполнена',
        body: 'Видео не опубликовано, попробуйте еще раз.',
    };
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
        return serializeAndroidPermissionRequest(async () => {
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
        });
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

        const data = message?.data || {};
        const isCirclePublishResult = data?.type === 'video_circle_publish_result';
        const fallback = isCirclePublishResult ? getVideoCirclePublishCopy(data) : null;

        const title = message?.notification?.title || fallback?.title || 'Уведомление';
        const body = message?.notification?.body || fallback?.body || '';

        // Save to in-app notification history (no Alert)
        if (_addNotification) {
            _addNotification({
                type: data?.type || 'general',
                title,
                body,
                data,
            });
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

        if (data.type === 'video_circle_publish_result') {
            // @ts-ignore
            navigationRef.navigate('VideoCirclesScreen');
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

        if (data.type === 'channel_news_personal') {
            const channelRaw = data.channelId || params.channelId;
            const channelId = Number.parseInt(String(channelRaw || ''), 10);
            if (Number.isFinite(channelId) && channelId > 0) {
                // @ts-ignore
                navigationRef.navigate('ChannelDetails', { channelId });
            }
            return;
        }

        if (data.type === 'new_message') {
            const senderRaw = data.senderId || params.userId || params.senderId;
            const senderId = Number.parseInt(String(senderRaw || ''), 10);
            if (Number.isFinite(senderId) && senderId > 0) {
                // @ts-ignore
                navigationRef.navigate('Chat', { userId: senderId });
            }
            return;
        }

        if (data.type === 'room_message') {
            const roomIDRaw = data.roomId || params.roomId;
            const roomNameRaw = data.roomName || params.roomName;
            const roomID = Number.parseInt(String(roomIDRaw || ''), 10);
            if (Number.isFinite(roomID) && roomID > 0) {
                const roomName = typeof roomNameRaw === 'string' && roomNameRaw.trim()
                    ? roomNameRaw.trim()
                    : 'Room';
                // @ts-ignore
                navigationRef.navigate('RoomChat', { roomId: roomID, roomName });
            }
            return;
        }

        if (
            data.type === 'yatra_join_requested' ||
            data.type === 'yatra_join_approved' ||
            data.type === 'yatra_join_rejected' ||
            data.type === 'yatra_approved' ||
            data.type === 'yatra_rejected' ||
            data.type === 'yatra_cancelled'
        ) {
            const yatraRaw = data.yatraId || params.yatraId;
            const yatraId = Number.parseInt(String(yatraRaw || ''), 10);
            if (Number.isFinite(yatraId) && yatraId > 0) {
                // @ts-ignore
                navigationRef.navigate('YatraDetail', { yatraId });
            } else {
                // @ts-ignore
                navigationRef.navigate('Portal', { initialTab: 'travel' });
            }
            return;
        }

        if (data.type === 'yatra_broadcast') {
            const roomIDRaw = data.roomId || params.roomId;
            const roomID = Number.parseInt(String(roomIDRaw || ''), 10);
            if (Number.isFinite(roomID) && roomID > 0) {
                const roomNameRaw = data.roomName || params.roomName;
                const roomName = typeof roomNameRaw === 'string' && roomNameRaw.trim()
                    ? roomNameRaw.trim()
                    : 'Yatra Chat';
                // @ts-ignore
                navigationRef.navigate('RoomChat', { roomId: roomID, roomName, isYatraChat: true });
                return;
            }

            const yatraRaw = data.yatraId || params.yatraId;
            const yatraId = Number.parseInt(String(yatraRaw || ''), 10);
            if (Number.isFinite(yatraId) && yatraId > 0) {
                // @ts-ignore
                navigationRef.navigate('YatraDetail', { yatraId });
            } else {
                // @ts-ignore
                navigationRef.navigate('Portal', { initialTab: 'travel' });
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
            // Persist for history: background messages arrive before JS context is
            // fully up, so we store them in a staging key and flush later.
            const raw = await AsyncStorage.getItem('pending_notifications');
            const pending: any[] = raw ? JSON.parse(raw) : [];
            pending.push({
                type: data?.type || 'general',
                title: remoteMessage?.notification?.title || 'Уведомление',
                body: remoteMessage?.notification?.body || '',
                data,
                receivedAt: Date.now(),
            });
            await AsyncStorage.setItem('pending_notifications', JSON.stringify(pending));
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
