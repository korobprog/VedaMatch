'use client';

import { useState, useEffect } from 'react';

interface Stats {
    totalYatras: number;
    draftYatras: number;
    openYatras: number;
    activeYatras: number;
    completedYatras: number;
    cancelledYatras: number;
    pendingReports: number;
}

export function YatraStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return null;
    }

    const statCards = [
        { label: 'Total Yatras', value: stats.totalYatras, color: 'blue' },
        { label: 'Draft', value: stats.draftYatras, color: 'gray' },
        { label: 'Open', value: stats.openYatras, color: 'green' },
        { label: 'Active', value: stats.activeYatras, color: 'blue' },
        { label: 'Completed', value: stats.completedYatras, color: 'purple' },
        { label: 'Cancelled', value: stats.cancelledYatras, color: 'red' },
        { label: '⚠️ Pending Reports', value: stats.pendingReports, color: 'red' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {statCards.map((stat) => (
                <div key={stat.label} className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">{stat.label}</div>
                    <div className={`text-2xl font-bold mt-1 text-${stat.color}-600`}>
                        {stat.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
