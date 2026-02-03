'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Report {
    id: number;
    targetType: string;
    targetId: number;
    reason: string;
    description: string;
    status: string;
    adminNotes: string;
    createdAt: string;
    resolvedAt?: string;
    reporter: {
        id: number;
        karmicName: string;
        spiritualName: string;
        email: string;
    };
    resolver?: {
        karmicName: string;
        spiritualName: string;
    };
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [adminNotes, setAdminNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [params.id]);

    const fetchReport = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra-reports/${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch report');

            const data = await response.json();
            setReport(data);
            setAdminNotes(data.adminNotes || '');
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!adminNotes.trim()) {
            alert('Please provide admin notes before resolving');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra-reports/${params.id}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: adminNotes }),
            });

            if (!response.ok) throw new Error('Failed to resolve report');

            alert('Report resolved successfully!');
            router.push('/yatra/reports');
        } catch (error) {
            console.error('Error resolving report:', error);
            alert('Failed to resolve report');
        } finally {
            setProcessing(false);
        }
    };

    const handleDismiss = async () => {
        if (!adminNotes.trim()) {
            alert('Please provide a reason for dismissing');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra-reports/${params.id}/dismiss`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: adminNotes }),
            });

            if (!response.ok) throw new Error('Failed to dismiss report');

            alert('Report dismissed successfully!');
            router.push('/yatra/reports');
        } catch (error) {
            console.error('Error dismissing report:', error);
            alert('Failed to dismiss report');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading report...</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600">Report not found</p>
                    <Link href="/yatra/reports" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
                        ← Back to Reports
                    </Link>
                </div>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700',
        reviewing: 'bg-blue-100 text-blue-700',
        resolved: 'bg-green-100 text-green-700',
        dismissed: 'bg-gray-100 text-gray-700',
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Link href="/yatra/reports" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
                        ← Back to Reports
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Report #{report.id}</h1>
                    <p className="text-gray-600 mt-1">
                        Submitted {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()}
                    </p>
                </div>
                <span className={`px-4 py-2 text-sm font-semibold rounded-full ${statusColors[report.status]}`}>
                    {report.status.toUpperCase()}
                </span>
            </div>

            {/* Report Details */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Report Details</h2>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Target Type</label>
                        <p className="mt-1 font-semibold capitalize">{report.targetType}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Target ID</label>
                        <Link
                            href={report.targetType === 'yatra' ? `/yatra/${report.targetId}` : `/organizers/${report.targetId}`}
                            className="mt-1 font-semibold text-blue-600 hover:text-blue-800 block"
                        >
                            #{report.targetId} (View)
                        </Link>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Reason</label>
                        <p className="mt-1 font-semibold capitalize">{report.reason.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Reporter</label>
                        <Link
                            href={`/users/${report.reporter.id}`}
                            className="mt-1 font-semibold text-blue-600 hover:text-blue-800 block"
                        >
                            {report.reporter.karmicName} {report.reporter.spiritualName}
                        </Link>
                        <p className="text-xs text-gray-500">{report.reporter.email}</p>
                    </div>
                </div>

                {report.description && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-500">Description</label>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap">{report.description}</p>
                    </div>
                )}

                {report.resolvedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-500">Resolved</label>
                        <p className="mt-1 text-gray-700">
                            {new Date(report.resolvedAt).toLocaleString()} by {report.resolver?.karmicName} {report.resolver?.spiritualName}
                        </p>
                    </div>
                )}
            </div>

            {/* Admin Response */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Response</h2>

                {report.status === 'resolved' || report.status === 'dismissed' ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Admin Notes</label>
                        <p className="text-gray-700 whitespace-pre-wrap">{report.adminNotes || 'No notes provided'}</p>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Admin Notes / Response to Reporter *
                            </label>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Write your response to the reporter. This will be sent to them via notification."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Be professional and helpful. Explain your decision clearly.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleDismiss}
                                disabled={processing || !adminNotes.trim()}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Processing...' : 'Dismiss Report'}
                            </button>
                            <button
                                type="button"
                                onClick={handleResolve}
                                disabled={processing || !adminNotes.trim()}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Processing...' : 'Resolve Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Action Recommendations */}
            {(report.status === 'pending' || report.status === 'reviewing') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 Recommended Actions:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Review the {report.targetType} in question</li>
                        <li>• Check reporter's history for patterns</li>
                        <li>• If valid complaint: Take action on the {report.targetType} (cancel, block, etc.)</li>
                        <li>• If invalid: Dismiss with explanation</li>
                        <li>• Always respond professionally to the reporter</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
