'use client';
import { getAuthToken } from '@/lib/auth';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface Template {
    id: number;
    name: string;
    subject: string;
    body: string;
    type: string;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
}

const TEMPLATE_TYPES = [
    { value: 'yatra_approved', label: 'Yatra Approved' },
    { value: 'yatra_rejected', label: 'Yatra Rejected' },
    { value: 'organizer_blocked', label: 'Organizer Blocked' },
    { value: 'broadcast', label: 'General Broadcast' },
];

export default function TemplatesPage() {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        body: '',
        type: 'broadcast',
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/templates`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            showToast('Error loading templates', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingTemplate
                ? `${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/templates/${editingTemplate.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/templates`;

            const method = editingTemplate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getAuthToken()}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error('Failed to save');

            fetchTemplates();
            closeModal();
            showToast('Template saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving template:', error);
            showToast('Failed to save template', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/templates/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            fetchTemplates();
            showToast('Template deleted', 'info');
        } catch (error) {
            console.error('Error deleting template:', error);
            showToast('Error deleting template', 'error');
        }
    };

    const openModal = (template?: Template) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                subject: template.subject,
                body: template.body,
                type: template.type,
            });
        } else {
            setEditingTemplate(null);
            setFormData({ name: '', subject: '', body: '', type: 'broadcast' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
                    <p className="text-gray-600 mt-1">Manage system emails and notifications</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Template
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading...</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {templates.map((template) => (
                                <tr key={template.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{template.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{template.subject}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {template.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => openModal(template)}
                                            className="p-1 hover:bg-gray-100 rounded text-blue-600"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {!template.isDefault && (
                                            <button
                                                onClick={() => handleDelete(template.id)}
                                                className="p-1 hover:bg-gray-100 rounded text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal - Same as before but with minor consistent tweaks */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                        <h2 className="text-xl font-bold mb-4">
                            {editingTemplate ? 'Edit Template' : 'New Template'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        {TEMPLATE_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Body (supports {'{{userName}}'}, {'{{yatraTitle}}'})
                                </label>
                                <textarea
                                    required
                                    rows={8}
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Template
                                </button>
                            </div>
                        </form>

                        {/* Variables Hint */}
                        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
                            <strong>Available Variables:</strong> {'{{userName}}, {{yatraTitle}}, {{reason}}, {{adminNotes}}'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
