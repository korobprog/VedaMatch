'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notification {
    id: number;
    type: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export function AdminNotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            // Use pending status to get unread ones primarily, but we'll sort them
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Assuming data is { notifications: [], total: ... } or just []
                const notifs = data.notifications || [];
                setNotifications(notifs);
                setUnreadCount(notifs.filter((n: Notification) => !n.isRead).length);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications/${id}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            // Optimistic update
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        // Ideally backend should have an endpoint for this, but for now we'll do what we can
        // Or just loop through visible unread? Let's skip complex logic for MVP.
        // We will just fetch again to update list.
        fetchNotifications();
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        setIsOpen(false);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'report_created': return 'bg-red-100 text-red-600';
            case 'yatra_created': return 'bg-blue-100 text-blue-600';
            case 'organizer_blocked': return 'bg-orange-100 text-orange-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="relative p-2 hover:bg-[var(--secondary)] rounded-full cursor-pointer transition-all"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                    <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Refresh
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                                        <div className="flex-1">
                                            <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(notification.createdAt).toLocaleDateString()} • {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                        <Link href="/notifications" className="text-xs font-medium text-gray-600 block w-full h-full" onClick={() => setIsOpen(false)}>
                            View All Notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
