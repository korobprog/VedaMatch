'use client';
import { getAuthToken } from '@/lib/auth';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Organizer {
    userId: number;
    name: string;
    email: string;
    totalYatras: number;
    activeYatras: number;
    completedYatras: number;
    averageRating: number;
    totalReviews: number;
    totalParticipants: number;
    isBlocked: boolean;
    blockReason?: string;
}

export default function OrganizersPage() {
    const [organizers, setOrganizers] = useState<Organizer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        blockedOnly: false,
        topRated: false,
        minYatras: '',
        page: 1,
    });
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchOrganizers();
    }, [filters]);

    const fetchOrganizers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.blockedOnly) params.append('blocked_only', 'true');
            if (filters.topRated) params.append('top_rated', 'true');
            if (filters.minYatras) params.append('min_yatras', filters.minYatras);
            params.append('page', filters.page.toString());

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/organizers?${params}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch organizers');

            const data = await response.json();
            setOrganizers(data.organizers || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching organizers:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Organizer Management</h1>
                <p className="text-gray-600 mt-1">Manage tour organizers and their permissions</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min Tours
                        </label>
                        <input
                            type="number"
                            value={filters.minYatras}
                            onChange={(e) => setFilters({ ...filters, minYatras: e.target.value, page: 1 })}
                            placeholder="e.g., 5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.blockedOnly}
                            onChange={(e) => setFilters({ ...filters, blockedOnly: e.target.checked, page: 1 })}
                            className="w-4 h-4 text-red-600 rounded"
                        />
                        <span className="text-sm text-red-700 font-medium">🚫 Blocked Only</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.topRated}
                            onChange={(e) => setFilters({ ...filters, topRated: e.target.checked, page: 1 })}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">⭐ Top Rated (4.5+)</span>
                    </label>
                </div>
            </div>

            {/* Organizers Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Organizers ({total})
                    </h2>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading organizers...</p>
                    </div>
                ) : organizers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No organizers found. Try adjusting your filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Organizer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Tours
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Rating
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Participants
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {organizers.map((org) => (
                                    <tr key={org.userId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/organizers/${org.userId}`}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                {org.name}
                                            </Link>
                                            <div className="text-xs text-gray-500 mt-1">{org.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-medium">{org.totalYatras} total</div>
                                            <div className="text-xs text-gray-500">
                                                {org.activeYatras} active • {org.completedYatras} completed
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <span className="text-yellow-500 mr-1">⭐</span>
                                                <span className="font-medium">
                                                    {org.averageRating.toFixed(1)}
                                                </span>
                                                <span className="text-xs text-gray-500 ml-1">
                                                    ({org.totalReviews})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            {org.totalParticipants}
                                        </td>
                                        <td className="px-6 py-4">
                                            {org.isBlocked ? (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                                    Blocked
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/organizers/${org.userId}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {total > 20 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            Showing {(filters.page - 1) * 20 + 1} - {Math.min(filters.page * 20, total)} of {total}
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                disabled={filters.page === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                disabled={filters.page * 20 >= total}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
