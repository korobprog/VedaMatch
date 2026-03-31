import {
    getMessaging,
    requestPermission,
    getToken,
    getAPNSToken,
    onMessage,
    onNotificationOpenedApp,
    getInitialNotification,
    onTokenRefresh,
    AuthorizationStatus
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import i18n from '../i18n';
import { navigationRef } from '../navigation/navigationRef';
import { contactService } from './contactService';
import { emitSupportUpdate } from './supportService';
import { serializeAndroidPermissionRequest } from '../utils/permissionRequestQueue';
import { buildDirectChatRoute } from '../utils/directChatNavigation';

// External addNotification hook — wired at runtime from NotificationProvider
type AddNotificationFn = (notif: { type: string; title: string; body: string; data: Record<string, any> }) => void;
let _addNotification: AddNotificationFn | null = null;
export const setNotificationAdder = (fn: AddNotificationFn) => { _addNotification = fn; };

type IncomingCallPushHandler = (payload: Record<string, any>) => void;
let _incomingCallPushHandler: IncomingCallPushHandler | null = null;
export const setIncomingCallPushHandler = (fn: IncomingCallPushHandler | null) => {
    _incomingCallPushHandler = fn;
};
let hasLoggedMissingApsEntitlement = false;
let hasLoggedApnsUnavailable = false;

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

const navigateFromNotificationToDirectChat = (options: { userId?: number; name?: string } = {}) => {
    const route = buildDirectChatRoute(options);
    if (route.name === 'Chat') {
        navigationRef.navigate(route.name, route.params);
        return;
    }
    navigationRef.navigate(route.name);
};

const getVideoCirclePublishCopy = (data: any) => {
    const language = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('hi') ? 'hi' : 'en';
    const status = String(data?.status || '').toLowerCase();
    if (status === 'success') {
        return {
            title: language === 'ru' ? 'Видео опубликовано' : language === 'hi' ? 'वीडियो प्रकाशित हो गया' : 'Video published',
            body: language === 'ru' ? 'Ваш кружок опубликован и появился в ленте.' : language === 'hi' ? 'आपका सर्कल प्रकाशित हो गया और फ़ीड में दिखाई दे रहा है।' : 'Your circle has been published and appeared in the feed.',
        };
    }
    return {
        title: language === 'ru' ? 'Публикация не выполнена' : language === 'hi' ? 'प्रकाशन नहीं हुआ' : 'Publishing failed',
        body: language === 'ru' ? 'Видео не опубликовано, попробуйте еще раз.' : language === 'hi' ? 'वीडियो प्रकाशित नहीं हुआ, फिर से प्रयास करें।' : 'Video was not published, please try again.',
    };
};

const getDefaultNotificationTitle = () => {
    if (i18n.language?.startsWith('ru')) return 'Уведомление';
    if (i18n.language?.startsWith('hi')) return 'सूचना';
    return 'Notification';
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
                const apnsToken = await waitForIosApnsToken(messaging);
                logPushTelemetry('apns_token_state', { hasToken: !!apnsToken });
                if (!apnsToken) {
                    if (!hasLoggedApnsUnavailable) {
                        hasLoggedApnsUnavailable = true;
                        console.warn('[NotificationService] APNS token unavailable on iOS; skipping FCM token request. Check push capability/profile if this persists.');
                    }
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
                if (!hasLoggedMissingApsEntitlement) {
                    hasLoggedMissingApsEntitlement = true;
                    console.warn('[NotificationService] FCM token unavailable: missing aps-environment entitlement in current iOS signing profile.');
                }
                logPushTelemetry('token_register_skipped', { reason: 'missing_aps_environment' });
                return null;
            }
            if (isMessagingUnregisteredError(error)) {
                logPushTelemetry('token_register_skipped', { reason: 'messaging_unregistered' });
                return null;
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
        const params = safeParseParams(data.params);
        if (data?.type === 'voip_call' && _incomingCallPushHandler) {
            _incomingCallPushHandler(data);
        }
        const isCirclePublishResult = data?.type === 'video_circle_publish_result';
        const fallback = isCirclePublishResult ? getVideoCirclePublishCopy(data) : null;

        const title = message?.notification?.title || fallback?.title || getDefaultNotificationTitle();
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

        if (data?.type === 'support_update') {
            emitSupportUpdate({
                conversationId: parseNumericId(data.conversationId, params.conversationId),
                source: 'push',
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
            const callerName = String(payload?.callerName || '').trim()
                || i18n.t('calls.incomingCall', { defaultValue: 'Incoming call' });
            const callerId = parseNumericId(payload?.senderId, payload?.targetId, payload?.userId, params?.senderId, params?.targetId, params?.userId);
            // @ts-ignore
            navigationRef.navigate('CallScreen', { isIncoming: true, callerName, targetId: callerId });
            return;
        }

        if (!navigationRef.isReady()) {
            return;
        }

        if (data.screen) {
            if (data.screen === 'Chat' || data.screen === 'ChatInbox') {
                navigateFromNotificationToDirectChat({
                    userId: parseNumericId(data.userId, data.senderId, params.userId, params.senderId),
                    name: typeof data.name === 'string' ? data.name : typeof params.name === 'string' ? params.name : undefined,
                });
                return;
            }
            if (data.screen === 'UnionApprovals') {
                // @ts-ignore
                navigationRef.navigate('UnionApprovals', {
                    focusApprovalId: parseNumericId(data.approvalId, params.approvalId),
                });
                return;
            }
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
            navigateFromNotificationToDirectChat({
                userId: Number.isFinite(senderId) && senderId > 0 ? senderId : undefined,
                name: typeof data.senderName === 'string'
                    ? data.senderName
                    : typeof data.name === 'string'
                        ? data.name
                        : typeof params.name === 'string'
                            ? params.name
                            : undefined,
            });
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
                title: remoteMessage?.notification?.title || getDefaultNotificationTitle(),
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
