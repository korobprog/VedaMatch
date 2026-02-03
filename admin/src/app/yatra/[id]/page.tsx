'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { YatraStatusBadge } from '@/components/yatra/YatraStatusBadge';
import { YatraApprovalModal } from '@/components/yatra/YatraApprovalModal';

interface Yatra {
    id: number;
    title: string;
    description: string;
    theme: string;
    status: string;
    startDate: string;
    endDate: string;
    startCity: string;
    endCity: string;
    startLatitude: number;
    startLongitude: number;
    endLatitude: number;
    endLongitude: number;
    participantCount: number;
    maxParticipants: number;
    language: string;
    difficulty: string;
    organizer: {
        id: number;
        karmicName: string;
        spiritualName: string;
        email: string;
    };
    coverImageURL?: string;
    createdAt: string;
}

interface Participant {
    id: number;
    status: string;
    joinedAt: string;
    user: {
        id: number;
        karmicName: string;
        spiritualName: string;
        email: string;
    };
}

export default function YatraDetailPage() {
    const params = useParams();
    const [yatra, setYatra] = useState<Yatra | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showParticipants, setShowParticipants] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'cancel' | null>(null);

    useEffect(() => {
        fetchYatra();
    }, [params.id]);

    const fetchYatra = async () => {
        try {
            // Fetch yatra details
            const yatraRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/yatra/${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!yatraRes.ok) throw new Error('Failed to fetch yatra');
            const yatraData = await yatraRes.json();
            setYatra(yatraData);

            // Fetch participants
            const participantsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/${params.id}/participants`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (participantsRes.ok) {
                const participantsData = await participantsRes.json();
                setParticipants(participantsData);
            }
        } catch (error) {
            console.error('Error fetching yatra:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveParticipant = async (participantId: number) => {
        if (!confirm('Are you sure you want to remove this participant?')) return;

        const reason = prompt('Reason for removal (required):');
        if (!reason) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/${params.id}/participants/${participantId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) throw new Error('Failed to remove participant');

            alert('Participant removed successfully');
            fetchYatra();
        } catch (error) {
            console.error('Error removing participant:', error);
            alert('Failed to remove participant');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading yatra...</p>
                </div>
            </div>
        );
    }

    if (!yatra) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600">Yatra not found</p>
                </div>
            </div>
        );
    }

    const approvedCount = participants.filter(p => p.status === 'approved').length;
    const pendingCount = participants.filter(p => p.status === 'pending').length;

    return (
        <>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Link href="/yatra" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
                            ← Back to Yatras
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">{yatra.title}</h1>
                        <p className="text-gray-600 mt-1">{yatra.theme} • {yatra.language}</p>
                    </div>
                    <YatraStatusBadge status={yatra.status} />
                </div>

                {/* Cover Image */}
                {yatra.coverImageURL && (
                    <div className="rounded-lg overflow-hidden">
                        <img
                            src={yatra.coverImageURL}
                            alt={yatra.title}
                            className="w-full h-64 object-cover"
                        />
                    </div>
                )}

                {/* Main Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{yatra.description}</p>
                        </div>

                        {/* Route */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-3">Route</h2>
                            <div className="space-y-2"> <div className="flex items-center">
                                <span className="text-green-600 font-semibold mr-2">📍 Start:</span>
                                <span className="text-gray-700">{yatra.startCity}</span>
                            </div>
                                <div className="flex items-center">
                                    <span className="text-red-600 font-semibold mr-2">🏁 End:</span>
                                    <span className="text-gray-700">{yatra.endCity}</span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    Coordinates: ({yatra.startLatitude}, {yatra.startLongitude}) → ({yatra.endLatitude}, {yatra.endLongitude})
                                </div>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Participants ({approvedCount}/{yatra.maxParticipants})
                                </h2>
                                <button
                                    onClick={() => setShowParticipants(!showParticipants)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    {showParticipants ? 'Hide' : 'Show'} All ({participants.length})
                                </button>
                            </div>

                            {pendingCount > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                    <p className="text-yellow-800 text-sm">
                                        ⚠️ {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}

                            {showParticipants && participants.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Participant</th>
                                                <th className="px-4 py-2 text-left">Status</th>
                                                <th className="px-4 py-2 text-left">Joined</th>
                                                <th className="px-4 py-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {participants.map((p) => (
                                                <tr key={p.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <Link href={`/users/${p.user.id}`} className="text-blue-600 hover:text-blue-800">
                                                            {p.user.karmicName} {p.user.spiritualName}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {new Date(p.joinedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleRemoveParticipant(p.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Info & Actions */}
                    <div className="space-y-6">
                        {/* Info Card */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Details</h3>
                            <dl className="space-y-3 text-sm">
                                <div>
                                    <dt className="text-gray-500">Organizer</dt>
                                    <dd className="font-semibold">
                                        <Link href={`/organizers/${yatra.organizer.id}`} className="text-blue-600 hover:text-blue-800">
                                            {yatra.organizer.karmicName} {yatra.organizer.spiritualName}
                                        </Link>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Dates</dt>
                                    <dd className="font-semibold">
                                        {new Date(yatra.startDate).toLocaleDateString()} - {new Date(yatra.endDate).toLocaleDateString()}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Difficulty</dt>
                                    <dd className="font-semibold capitalize">{yatra.difficulty}</dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Created</dt>
                                    <dd className="text-gray-700">{new Date(yatra.createdAt).toLocaleDateString()}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Admin Actions */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Admin Actions</h3>
                            <div className="space-y-2">
                                {yatra.status === 'draft' && (
                                    <>
                                        <button
                                            onClick={() => setSelectedAction('approve')}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            ✅ Approve Yatra
                                        </button>
                                        <button
                                            onClick={() => setSelectedAction('reject')}
                                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        >
                                            ❌ Reject Yatra
                                        </button>
                                    </>
                                )}
                                {(yatra.status === 'open' || yatra.status === 'active') && (
                                    <button
                                        onClick={() => setSelectedAction('cancel')}
                                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        🚫 Force Cancel
                                    </button>
                                )}
                                <Link
                                    href={`/yatra/${yatra.id}/edit`}
                                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                                >
                                    ✏️ Edit Details
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {selectedAction && (
                <YatraApprovalModal
                    yatra={yatra}
                    actionType={selectedAction}
                    onClose={(refresh) => {
                        setSelectedAction(null);
                        if (refresh) fetchYatra();
                    }}
                />
            )}
        </>
    );
}
