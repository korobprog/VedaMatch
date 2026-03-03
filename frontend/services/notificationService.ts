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
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { navigationRef } from '../navigation/navigationRef';
import { contactService } from './contactService';
import { serializeAndroidPermissionRequest } from '../utils/permissionRequestQueue';

// External addNotification hook — wired at runtime from NotificationProvider
type AddNotificationFn = (notif: { type: string; title: string; body: string; data: Record<string, any> }) => void;
let _addNotification: AddNotificationFn | null = null;
export const setNotificationAdder = (fn: AddNotificationFn) => { _addNotification = fn; };

type IncomingCallPushHandler = (payload: Record<string, any>) => void;
let _incomingCallPushHandler: IncomingCallPushHandler | null = null;
export const setIncomingCallPushHandler = (fn: IncomingCallPushHandler | null) => {
    _incomingCallPushHandler = fn;
};

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

const normalizeErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message || String(error);
    }
    return String(error || '');
};

const isMissingApsEnvironmentEntitlement = (error: unknown): boolean => {
    if (Platform.OS !== 'ios') return false;
    const message = normalizeErrorMessage(error).toLowerCase();
    return (
        message.includes('aps-environment') ||
        (message.includes('messaging/unknown') && message.includes('authorization'))
    );
};

const isMessagingUnregisteredError = (error: unknown): boolean => {
    if (Platform.OS !== 'ios') return false;
    const message = normalizeErrorMessage(error).toLowerCase();
    return message.includes('messaging/unregistered') ||
        message.includes('registerdeviceforremotemessages');
};

const ensureIosRemoteMessageRegistration = async (messaging: any): Promise<void> => {
    if (Platform.OS !== 'ios') return;

    const alreadyRegistered = !!isDeviceRegisteredForRemoteMessages(messaging);
    if (alreadyRegistered) return;

    await registerDeviceForRemoteMessages(messaging);
    logPushTelemetry('device_registered_for_remote_messages', { platform: Platform.OS });
};

const waitForIosApnsToken = async (messaging: any): Promise<string | null> => {
    const attempts = 4;
    for (let i = 0; i < attempts; i += 1) {
        const apnsToken = await getAPNSToken(messaging);
        if (apnsToken) {
            return apnsToken;
        }
        if (i < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 350));
        }
    }
    return null;
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

const parseNumericId = (...values: any[]): number | undefined => {
    for (const value of values) {
        const parsed = Number.parseInt(String(value ?? ''), 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return undefined;
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

const ensureAndroidPostNotificationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return true;
    }

    const sdkVersion = typeof Platform.Version === 'number'
        ? Platform.Version
        : Number.parseInt(String(Platform.Version || '0'), 10);

    if (!Number.isFinite(sdkVersion) || sdkVersion < 33) {
        return true;
    }

    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) {
        return true;
    }

    const result = await PermissionsAndroid.request(permission);
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    logPushTelemetry('android_post_notifications_permission', { granted, result });

    return granted;
};

export const notificationService = {
    requestUserPermission: async () => {
        return serializeAndroidPermissionRequest(async () => {
            const hasAndroidPermission = await ensureAndroidPostNotificationPermission();
            if (!hasAndroidPermission) {
                logPushTelemetry('permission_status', {
                    enabled: false,
                    authStatus: 'android_post_notifications_denied',
                });
                return false;
            }

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

            if (Platform.OS === 'ios') {
                await ensureIosRemoteMessageRegistration(messaging);
                const apnsToken = await waitForIosApnsToken(messaging);
                logPushTelemetry('apns_token_state', { hasToken: !!apnsToken });
                if (!apnsToken) {
                    console.warn('[NotificationService] APNS token unavailable on iOS; skipping FCM token request. Check push capability/profile if this persists.');
                    logPushTelemetry('token_register_skipped', { reason: 'apns_token_unavailable' });
                    return null;
                }
            }

            const fcmToken = await getToken(messaging);
            if (fcmToken) {
                await AsyncStorage.setItem('pushToken', fcmToken);
                await registerTokenOnServer(fcmToken);
                return fcmToken;
            }
        } catch (error) {
            if (isMissingApsEnvironmentEntitlement(error)) {
                console.warn('[NotificationService] FCM token unavailable: missing aps-environment entitlement in current iOS signing profile.');
                logPushTelemetry('token_register_skipped', { reason: 'missing_aps_environment' });
                return null;
            }
            if (isMessagingUnregisteredError(error)) {
                try {
                    const messaging = getMessagingInstance();
                    await ensureIosRemoteMessageRegistration(messaging);
                    const apnsToken = await waitForIosApnsToken(messaging);
                    if (!apnsToken) {
                        logPushTelemetry('token_register_skipped', { reason: 'apns_token_unavailable_after_register' });
                        return null;
                    }
                    const retryFcmToken = await getToken(messaging);
                    if (retryFcmToken) {
                        await AsyncStorage.setItem('pushToken', retryFcmToken);
                        await registerTokenOnServer(retryFcmToken);
                        logPushTelemetry('token_register_retry_success', { platform: Platform.OS });
                        return retryFcmToken;
                    }
                } catch (retryError) {
                    const retryDetails = normalizeErrorMessage(retryError);
                    console.warn(`[NotificationService] FCM retry failed after device registration: ${retryDetails}`);
                }
            }

            const details = normalizeErrorMessage(error);
            console.warn(`[NotificationService] Failed to get FCM token: ${details}`);
            logPushTelemetry('token_register_error', { reason: 'get_token_failed' });
        }
        return null;
    },

    onMessageReceived: (message: any) => {
        console.log('[NotificationService] Foreground message:', message);

        const data = message?.data || {};
        if (data?.type === 'voip_call' && _incomingCallPushHandler) {
            _incomingCallPushHandler(data);
        }
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

        const params = safeParseParams(data.params);

        if (data.type === 'voip_call') {
            const payload = { ...params, ...data };
            if (_incomingCallPushHandler) {
                _incomingCallPushHandler(payload);
                return;
            }

            if (!navigationRef.isReady()) {
                return;
            }
            const callerName = String(payload?.callerName || '').trim() || 'Incoming Call';
            const callerId = parseNumericId(payload?.senderId, payload?.targetId, payload?.userId, params?.senderId, params?.targetId, params?.userId);
            // @ts-ignore
            navigationRef.navigate('CallScreen', { isIncoming: true, callerName, targetId: callerId });
            return;
        }

        if (!navigationRef.isReady()) {
            return;
        }

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
            console.warn(`[NotificationService] Failed to persist background notification: ${normalizeErrorMessage(error)}`);
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
                console.warn(`[NotificationService] Failed to register refreshed token: ${normalizeErrorMessage(error)}`);
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
