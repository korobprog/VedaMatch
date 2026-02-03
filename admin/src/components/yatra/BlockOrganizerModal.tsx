'use client';

import { useState } from 'react';
import { getAuthToken } from '@/lib/auth';

interface BlockOrganizerModalProps {
    organizerId: number;
    organizerName: string;
    onClose: (refresh?: boolean) => void;
}

export function BlockOrganizerModal({ organizerId, organizerName, onClose }: BlockOrganizerModalProps) {
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState<number | ''>('');
    const [isPermanent, setIsPermanent] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            alert('Please provide a reason for blocking');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/organizers/${organizerId}/block`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason,
                    duration: isPermanent ? 0 : duration || null,
                }),
            });

            if (!response.ok) throw new Error('Failed to block organizer');

            alert('Organizer blocked successfully!');
            onClose(true);
        } catch (error) {
            console.error('Error blocking organizer:', error);
            alert('Failed to block organizer');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-red-600 mb-4">🚫 Block Organizer</h2>
                <p className="text-gray-700 mb-1">
                    You are about to block: <strong>{organizerName}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                    This will prevent them from creating new tours and managing existing ones.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason for Blocking *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Explain why you are blocking this organizer..."
                        />
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={isPermanent}
                                onChange={(e) => {
                                    setIsPermanent(e.target.checked);
                                    if (e.target.checked) setDuration('');
                                }}
                                className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Permanent Block</span>
                        </label>

                        {!isPermanent && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Duration (days)
                                </label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : '')}
                                    min="1"
                                    max="365"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="Leave empty for permanent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    If left empty and not permanent, the block will be manual (no auto-expiry)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>⚠️ Warning:</strong> Blocking an organizer will:
                        </p>
                        <ul className="text-xs text-yellow-700 mt-2 space-y-1 ml-4">
                            <li>• Prevent them from creating new tours</li>
                            <li>• Prevent them from editing existing tours</li>
                            <li>• NOT automatically cancel their active tours</li>
                            <li>• Send them a notification with the reason</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            disabled={processing}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !reason.trim()}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {processing ? 'Blocking...' : '🚫 Block Organizer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
