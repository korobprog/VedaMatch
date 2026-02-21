import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notification_history';
const MAX_NOTIFICATIONS = 100;

export type NotificationType =
    | 'new_message'
    | 'room_message'
    | 'wallet_bonus'
    | 'wallet_activated'
    | 'referral_joined'
    | 'referral_activated'
    | 'channel_news_personal'
    | 'yatra_join_requested'
    | 'yatra_join_approved'
    | 'yatra_join_rejected'
    | 'yatra_approved'
    | 'yatra_rejected'
    | 'yatra_cancelled'
    | 'yatra_broadcast'
    | 'video_circle_publish_result'
    | 'news'
    | string;

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    data: Record<string, any>;
    receivedAt: number;
    isRead: boolean;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notif: Omit<AppNotification, 'id' | 'receivedAt' | 'isRead'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    isPanelVisible: boolean;
    setPanelVisible: (visible: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const generateId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isPanelVisible, setPanelVisible] = useState(false);
    const loadedRef = useRef(false);

    // Load from AsyncStorage on mount
    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;

        AsyncStorage.getItem(STORAGE_KEY)
            .then(raw => {
                if (!raw) return;
                try {
                    const parsed: AppNotification[] = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        setNotifications(parsed);
                    }
                } catch {
                    // ignore malformed data
                }
            })
            .catch(() => { });
    }, []);

    // Persist whenever notifications change
    const persist = useCallback((items: AppNotification[]) => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => { });
    }, []);

    const addNotification = useCallback(
        (notif: Omit<AppNotification, 'id' | 'receivedAt' | 'isRead'>) => {
            setNotifications(prev => {
                const newItem: AppNotification = {
                    ...notif,
                    id: generateId(),
                    receivedAt: Date.now(),
                    isRead: false,
                };
                // Prepend new, trim to max
                const updated = [newItem, ...prev].slice(0, MAX_NOTIFICATIONS);
                persist(updated);
                return updated;
            });
        },
        [persist],
    );

    const markAsRead = useCallback(
        (id: string) => {
            setNotifications(prev => {
                const updated = prev.map(n => (n.id === id ? { ...n, isRead: true } : n));
                persist(updated);
                return updated;
            });
        },
        [persist],
    );

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, isRead: true }));
            persist(updated);
            return updated;
        });
    }, [persist]);

    const clearAll = useCallback(() => {
        setNotifications([]);
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => { });
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearAll,
                isPanelVisible,
                setPanelVisible,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};
