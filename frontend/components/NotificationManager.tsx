import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, setNotificationAdder } from '../services/notificationService';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';

// Wire the context's addNotification into the notification service and
// flush any notifications that arrived while the app was in the background.
export const NotificationManager: React.FC = () => {
    const { isLoggedIn } = useUser();
    const { addNotification } = useNotifications();

    // Register addNotification once on mount
    useEffect(() => {
        setNotificationAdder(addNotification);
    }, [addNotification]);

    // Flush pending background notifications to history
    useEffect(() => {
        if (!isLoggedIn) return;

        const flushPending = async () => {
            try {
                const raw = await AsyncStorage.getItem('pending_notifications');
                if (!raw) return;
                const pending: Array<{ type: string; title: string; body: string; data: Record<string, any>; receivedAt: number }> =
                    JSON.parse(raw);
                await AsyncStorage.removeItem('pending_notifications');

                // Add them in reverse chronological order (oldest first → newest on top after prepend)
                for (const item of [...pending].reverse()) {
                    addNotification({ type: item.type, title: item.title, body: item.body, data: item.data });
                }
            } catch {
                // ignore
            }
        };

        flushPending();
    }, [isLoggedIn, addNotification]);

    useEffect(() => {
        if (!isLoggedIn) return;

        let unsubscribe: (() => void) | null = null;
        let disposed = false;

        (async () => {
            const hasPermission = await notificationService.requestUserPermission();
            if (hasPermission) {
                await notificationService.getFcmToken();
            }
            if (disposed) return;
            unsubscribe = notificationService.setupListeners();
        })();

        return () => {
            disposed = true;
            if (unsubscribe) unsubscribe();
        };
    }, [isLoggedIn]);

    return null;
};

export default NotificationManager;
