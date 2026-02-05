import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../App';

export const notificationService = {
    requestUserPermission: async () => {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('[NotificationService] Authorization status:', authStatus);
            return true;
        }
        return false;
    },

    getFcmToken: async () => {
        try {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
                console.log('[NotificationService] FCM Token:', fcmToken);
                await AsyncStorage.setItem('pushToken', fcmToken);
                return fcmToken;
            }
        } catch (error) {
            console.error('[NotificationService] Failed to get FCM token:', error);
        }
        return null;
    },

    onMessageReceived: (message: any) => {
        console.log('[NotificationService] Foreground message:', message);

        // Show in-app alert for foreground messages
        if (message.notification) {
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

        console.log('[NotificationService] Handling notification action:', data);

        // Navigation logic based on data type or screen property
        if (navigationRef.isReady()) {
            if (data.screen) {
                // @ts-ignore
                navigationRef.navigate(data.screen, data.params ? JSON.parse(data.params) : {});
            } else if (data.type === 'wallet_bonus' || data.type === 'wallet_activated') {
                // @ts-ignore
                navigationRef.navigate('Wallet');
            } else if (data.type === 'referral_joined' || data.type === 'referral_activated') {
                // @ts-ignore
                navigationRef.navigate('InviteFriends');
            }
        }
    },

    setupListeners: () => {
        // Foreground messages
        const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
            notificationService.onMessageReceived(remoteMessage);
        });

        // App opened from background/quit state
        messaging().onNotificationOpenedApp(remoteMessage => {
            notificationService.handleNotificationAction(remoteMessage.data);
        });

        // App opened from quit state
        messaging().getInitialNotification().then(remoteMessage => {
            if (remoteMessage) {
                notificationService.handleNotificationAction(remoteMessage.data);
            }
        });

        return unsubscribeForeground;
    }
};
