'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '../../lib/auth';

interface Notification {
    id: number;
    type: string;
    message: string;
    link?: string;
    linkTo?: string;
    isRead: boolean;
    read?: boolean;
    createdAt: string;
}

interface PushHealth {
    delivery_success_rate: number;
    invalid_token_rate: number;
    retry_rate: number;
    latency_p95: number;
    total_events: number;
    fcmConfigured: boolean;
    fcmKeySource: string;
}

const normalizeNotification = (raw: any): Notification => ({
    ...raw,
    isRead: typeof raw?.isRead === 'boolean' ? raw.isRead : !!raw?.read,
    link: raw?.link || raw?.linkTo,
});

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [pushHealth, setPushHealth] = useState<PushHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
        fetchPushHealth();
    }, [page]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications?page=${page}&limit=20`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications((data.notifications || []).map(normalizeNotification));
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPushHealth = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/push/health?window_hours=24`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) return;
            const data = await response.json();
            setPushHealth(data);
        } catch (error) {
            console.error('Error fetching push health:', error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const token = getAuthToken();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications/${id}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true, read: true } : n)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            router.push(notification.link);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-600 mt-1">Stay updated with important events</p>
                </div>
                <button
                    onClick={() => {
                        fetchNotifications();
                        fetchPushHealth();
                    }}
                    className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium"
                >
                    Refresh List
                </button>
            </div>

            {pushHealth && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Success rate</p>
                        <p className="text-xl font-semibold">{pushHealth.delivery_success_rate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Invalid rate</p>
                        <p className="text-xl font-semibold">{pushHealth.invalid_token_rate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Retry rate</p>
                        <p className="text-xl font-semibold">{pushHealth.retry_rate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Latency p95</p>
                        <p className="text-xl font-semibold">{pushHealth.latency_p95} ms</p>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                        <p className="text-xs text-gray-500">FCM key</p>
                        <p className="text-xl font-semibold">{pushHealth.fcmConfigured ? 'Configured' : 'Missing'}</p>
                        <p className="text-[11px] text-gray-500 mt-1">source: {pushHealth.fcmKeySource}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No notifications found.
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 ${!notification.isRead ? 'bg-blue-50/40' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className={`w-3 h-3 mt-1.5 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-gray-200'}`} />
                                <div className="flex-1">
                                    <p className={`text-base ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                        {notification.message}
                                    </p>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-sm text-gray-500">
                                            {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString()}
                                        </p>
                                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase font-medium">
                                            {notification.type.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Simple Pagination */}
            <div className="flex justify-center space-x-4 mt-6">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="px-4 py-2 text-gray-600">Page {page}</span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={notifications.length < 20}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
