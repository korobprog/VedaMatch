'use client';

import { getApiBaseURL } from '@/lib/api';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAuthToken } from '@/lib/auth';

interface ThemeData {
    theme: string;
    count: number;
    completedCount: number;
}

export function ThemeTrendsChart() {
    const [data, setData] = useState<ThemeData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch(`${getApiBaseURL()}/admin/yatra/analytics/themes`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch theme data');

            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching theme trends:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading chart...</div>;
    }

    if (data.length === 0) {
        return <div className="text-center py-8 text-gray-500">No theme data available</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="theme" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Total Tours" />
                <Bar dataKey="completedCount" fill="#10b981" name="Completed Tours" />
            </BarChart>
        </ResponsiveContainer>
    );
}
