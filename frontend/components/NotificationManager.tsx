import React, { useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useUser } from '../context/UserContext';

export const NotificationManager: React.FC = () => {
    const { isLoggedIn } = useUser();

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

    // This component doesn't render anything UI-wise
    return null;
};

export default NotificationManager;
