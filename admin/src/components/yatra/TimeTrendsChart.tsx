'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendData {
    month: string;
    count: number;
    completedCount: number;
}

export function TimeTrendsChart() {
    const [data, setData] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/analytics/trends?months=12`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch trend data');

            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching time trends:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading chart...</div>;
    }

    if (data.length === 0) {
        return <div className="text-center py-8 text-gray-500">No trend data available</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Tours Created" />
                <Line type="monotone" dataKey="completedCount" stroke="#10b981" strokeWidth={2} name="Tours Completed" />
            </LineChart>
        </ResponsiveContainer>
    );
}
