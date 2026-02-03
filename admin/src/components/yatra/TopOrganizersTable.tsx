'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrganizerRanking {
    userId: number;
    name: string;
    avatar: string;
    totalYatras: number;
    completedYatras: number;
    averageRating: number;
    totalReviews: number;
    totalParticipants: number;
}

export function TopOrganizersTable() {
    const [rankings, setRankings] = useState<OrganizerRanking[]>([]);
    const [orderBy, setOrderBy] = useState('total');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRankings();
    }, [orderBy]);

    const fetchRankings = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/analytics/top-organizers?order_by=${orderBy}&limit=10`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to fetch rankings');

            const data = await response.json();
            setRankings(data);
        } catch (error) {
            console.error('Error fetching rankings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading...</div>;
    }

    return (
        <>
            {/* Sort Tabs */}
            <div className="flex space-x-2 mb-4 border-b border-gray-200">
                {[
                    { value: 'total', label: 'Most Tours' },
                    { value: 'rating', label: 'Highest Rated' },
                    { value: 'participants', label: 'Most Participants' },
                    { value: 'completed', label: 'Most Completed' },
                ].map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setOrderBy(option.value)}
                        className={`px-4 py-2 font-medium text-sm ${orderBy === option.value
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-2 text-left">#</th>
                            <th className="px-4 py-2 text-left">Organizer</th>
                            <th className="px-4 py-2 text-right">Tours</th>
                            <th className="px-4 py-2 text-right">Completed</th>
                            <th className="px-4 py-2 text-right">Rating</th>
                            <th className="px-4 py-2 text-right">Participants</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rankings.map((org, index) => (
                            <tr key={org.userId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-bold text-gray-400">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <Link href={`/organizers/${org.userId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                        {org.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">{org.totalYatras}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{org.completedYatras}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className="font-semibold">⭐ {org.averageRating.toFixed(1)}</span>
                                    <span className="text-xs text-gray-500 ml-1">({org.totalReviews})</span>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                                    {org.totalParticipants}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
