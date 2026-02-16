'use client';

import { getApiBaseURL } from '@/lib/api';

import { useState } from 'react';
import { getAuthToken } from '@/lib/auth';

interface YatraApprovalModalProps {
    yatra: any;
    actionType: 'approve' | 'reject' | 'cancel';
    onClose: (refresh?: boolean) => void;
}

export function YatraApprovalModal({ yatra, actionType, onClose }: YatraApprovalModalProps) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const endpoint = `${getApiBaseURL()}/admin/yatra/${yatra.id}/${actionType}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason, notes: reason }),
            });

            if (!response.ok) throw new Error(`Failed to ${actionType} yatra`);

            alert(`Yatra ${actionType}d successfully!`);
            onClose(true);
        } catch (error) {
            console.error(`Error ${actionType}ing yatra:`, error);
            alert(`Failed to ${actionType} yatra`);
        } finally {
            setLoading(false);
        }
    };

    const titles = {
        approve: 'Approve Yatra',
        reject: 'Reject Yatra',
        cancel: 'Cancel Yatra',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{titles[actionType]}</h2>
                <p className="text-gray-600 mb-4">
                    {yatra.title}
                </p>

                <form onSubmit={handleSubmit}>
                    {(actionType === 'reject' || actionType === 'cancel') && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason {actionType === 'reject' ? '(Required)' : '(Optional)'}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required={actionType === 'reject'}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={`Explain why you are ${actionType}ing this yatra...`}
                            />
                        </div>
                    )}

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            disabled={loading}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${actionType === 'approve'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {loading ? 'Processing...' : titles[actionType]}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
