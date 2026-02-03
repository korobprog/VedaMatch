'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Report {
    id: number;
    targetType: string;
    targetId: number;
    reason: string;
    description: string;
    status: string;
    createdAt: string;
    reporter: {
        karmicName: string;
        spiritualName: string;
    };
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        fetchReports();
    }, [filter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra-reports?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch reports');

            const data = await response.json();
            setReports(data.reports || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700',
        reviewing: 'bg-blue-100 text-blue-700',
        resolved: 'bg-green-100 text-green-700',
        dismissed: 'bg-gray-100 text-gray-700',
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Yatra Reports</h1>
                <p className="text-gray-600 mt-1">Review and manage user complaints</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 border-b border-gray-200">
                {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 font-medium capitalize ${filter === status
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Reports List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading reports...</p>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                        No {filter !== 'all' ? filter : ''} reports found.
                    </div>
                ) : (
                    reports.map((report) => (
                        <div key={report.id} className="bg-white rounded-lg shadow p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[report.status]}`}>
                                            {report.status}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>

                                    <div className="mt-3">
                                        <h3 className="font-semibold text-gray-900">
                                            Report on {report.targetType === 'yatra' ? 'Tour' : 'Organizer'} #{report.targetId}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Reason: <span className="font-medium">{report.reason.replace(/_/g, ' ')}</span>
                                        </p>
                                        {report.description && (
                                            <p className="text-sm text-gray-700 mt-2">{report.description}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            Reported by: {report.reporter.karmicName} {report.reporter.spiritualName}
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href={`/yatra/reports/${report.id}`}
                                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    View Details
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
