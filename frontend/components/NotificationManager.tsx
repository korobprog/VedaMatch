import React, { useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useUser } from '../context/UserContext';

export const NotificationManager: React.FC = () => {
    const { isLoggedIn } = useUser();

    useEffect(() => {
        const initPush = async () => {
            const hasPermission = await notificationService.requestUserPermission();
            if (hasPermission) {
                await notificationService.getFcmToken();
            }

            const unsubscribe = notificationService.setupListeners();
            return unsubscribe;
        };

        if (isLoggedIn) {
            const unsubPromise = initPush();
            return () => {
                unsubPromise.then(unsub => unsub && unsub());
            };
        }
    }, [isLoggedIn]);

    // This component doesn't render anything UI-wise
    return null;
};

export default NotificationManager;
