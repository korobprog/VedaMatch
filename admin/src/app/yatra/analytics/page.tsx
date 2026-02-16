'use client';

import { getApiBaseURL } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';

import { useState, useEffect } from 'react';
import { TopOrganizersTable } from '../../../components/yatra/TopOrganizersTable';
import { ThemeTrendsChart } from '../../../components/yatra/ThemeTrendsChart';
import { TimeTrendsChart } from '../../../components/yatra/TimeTrendsChart';
import { GeographySummary } from '../../../components/yatra/GeographySummary';

interface AverageMetrics {
    avgParticipants: number;
    avgRating: number;
    avgDuration: number;
    avgViews: number;
}

interface StatusDistribution {
    [key: string]: number;
}

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState<AverageMetrics | null>(null);
    const [distribution, setDistribution] = useState<StatusDistribution>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch average metrics
            const metricsRes = await fetch(`${getApiBaseURL()}/admin/yatra/analytics/metrics`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            // Fetch status distribution
            const distRes = await fetch(`${getApiBaseURL()}/admin/yatra/analytics/distribution`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (metricsRes.ok) {
                const metricsData = await metricsRes.json();
                setMetrics(metricsData);
            }

            if (distRes.ok) {
                const distData = await distRes.json();
                setDistribution(distData);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Yatra Analytics</h1>
                <p className="text-gray-600 mt-1">Tour statistics, trends, and insights</p>
            </div>

            {/* Average Metrics Cards */}
            {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Avg Participants</div>
                        <div className="text-3xl font-bold text-blue-600">
                            {metrics.avgParticipants.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">per tour</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Avg Rating</div>
                        <div className="text-3xl font-bold text-yellow-600">
                            ⭐ {metrics.avgRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">out of 5.0</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Avg Duration</div>
                        <div className="text-3xl font-bold text-purple-600">
                            {Math.round(metrics.avgDuration)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">days</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Avg Views</div>
                        <div className="text-3xl font-bold text-green-600">
                            {Math.round(metrics.avgViews)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">per tour</div>
                    </div>
                </div>
            )}

            {/* Status Distribution */}
            {Object.keys(distribution).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Status Distribution</h2>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {Object.entries(distribution).map(([status, count]) => (
                            <div key={status} className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{count}</div>
                                <div className="text-sm text-gray-600 capitalize">{status}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Organizers */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Top Organizers</h2>
                <TopOrganizersTable />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Theme Trends */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Theme Trends</h2>
                    <ThemeTrendsChart />
                </div>

                {/* Geography Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🗺️ Popular Destinations</h2>
                    <GeographySummary />
                </div>
            </div>

            {/* Time Trends - Full Width */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Tour Creation Trends (Last 12 Months)</h2>
                <TimeTrendsChart />
            </div>
        </div>
    );
}
