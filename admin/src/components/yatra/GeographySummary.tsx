'use client';

import { getApiBaseURL } from '@/lib/api';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth';

interface CityData {
    city: string;
    count: number;
    latitude: number;
    longitude: number;
}

export function GeographySummary() {
    const [data, setData] = useState<CityData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch(`${getApiBaseURL()}/admin/yatra/analytics/geography?limit=10`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch geography data');

            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching geography:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading...</div>;
    }

    if (data.length === 0) {
        return <div className="text-center py-8 text-gray-500">No geography data available</div>;
    }

    const maxCount = Math.max(...data.map(d => d.count));

    return (
        <div className="space-y-3">
            {data.map((city, index) => {
                const percentage = (city.count / maxCount) * 100;

                return (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">
                                {index + 1}. {city.city}
                            </span>
                            <span className="font-bold text-blue-600">{city.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}

            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                    📍 Showing top {data.length} most popular destinations
                </p>
            </div>
        </div>
    );
}
