'use client';

import { getApiBaseURL } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';

import { useState, useEffect } from 'react';
import { Send, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface Template {
    id: number;
    name: string;
    type: string;
}

export default function BroadcastPage() {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [recipientFilter, setRecipientFilter] = useState('active_organizers');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await fetch(`${getApiBaseURL()}/admin/yatra/templates`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (response.ok) {
                const data = await response.json();
                // Filter only broadcast templates or suitable ones
                setTemplates(data.filter((t: Template) => t.type === 'broadcast'));
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            showToast('Error loading templates', 'error');
        }
    };

    const handleSend = async () => {
        if (!selectedTemplate) return showToast('Please select a template', 'error');
        if (!confirm('Are you sure you want to send this broadcast? This cannot be undone.')) return;

        setSending(true);
        try {
            const response = await fetch(`${getApiBaseURL()}/admin/yatra/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getAuthToken()}`,
                },
                body: JSON.stringify({
                    template_id: parseInt(selectedTemplate),
                    recipient_filter: recipientFilter,
                }),
            });

            if (!response.ok) throw new Error('Failed to send');

            const data = await response.json();
            showToast(`Success! Broadcast sent to ${data.count} recipients.`, 'success');
            setSelectedTemplate('');
        } catch (error) {
            console.error('Error sending broadcast:', error);
            showToast('Failed to send broadcast', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Broadcast Email</h1>
                <p className="text-gray-600 mt-1">Send mass announcements to organizers</p>
            </div>

            <div className="bg-white rounded-lg shadow p-8 space-y-8">
                {/* Step 1: Select Audience */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
                        Select Audience
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-10">
                        {[
                            { id: 'active_organizers', label: 'Active Organizers', desc: 'Users with at least one active tour', icon: Users },
                            { id: 'all_organizers', label: 'All Organizers', desc: 'Any user who has created a tour', icon: Users },
                            { id: 'top_organizers', label: 'Top 10 Organizers', desc: 'Highest rated organizers only', icon: Users },
                        ].map((option) => (
                            <div
                                key={option.id}
                                onClick={() => setRecipientFilter(option.id)}
                                className={`p-4 border rounded-xl cursor-pointer transition-all ${recipientFilter === option.id
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                        : 'border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2 font-medium text-gray-900 mb-1">
                                    <option.icon className="w-4 h-4" /> {option.label}
                                </div>
                                <div className="text-sm text-gray-500">{option.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 2: Select Template */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span>
                        Select Content
                    </div>

                    <div className="pl-10">
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Choose a template --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>

                        {templates.length === 0 && (
                            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> No 'broadcast' templates found. Please create one in Templates section.
                            </p>
                        )}
                    </div>
                </div>

                {/* Action */}
                <div className="pt-6 border-t flex justify-end">
                    <button
                        onClick={handleSend}
                        disabled={!selectedTemplate || sending}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <>Sending...</>
                        ) : (
                            <>
                                <Send className="w-4 h-4" /> Send Broadcast
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
