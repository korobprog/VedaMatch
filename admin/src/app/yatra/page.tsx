'use client';

import { useState, useEffect } from 'react';
import { YatraTable } from '@/components/yatra/YatraTable';
import { YatraStats } from '@/components/yatra/YatraStats';

interface YatraFilters {
    status?: string;
    theme?: string;
    includeDrafts: boolean;
    includeCancelled: boolean;
    includeCompleted: boolean;
    reportedOnly: boolean;
    search: string;
    page: number;
}

export default function YatraManagementPage() {
    const [filters, setFilters] = useState<YatraFilters>({
        includeDrafts: true,
        includeCancelled: false,
        includeCompleted: false,
        reportedOnly: false,
        search: '',
        page: 1,
    });

    const [showStats, setShowStats] = useState(true);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Yatra Travel Management</h1>
                    <p className="text-gray-600 mt-1">Manage tours, organizers, and moderation</p>
                </div>
                <button
                    onClick={() => setShowStats(!showStats)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    {showStats ? 'Hide' : 'Show'} Stats
                </button>
            </div>

            {/* Statistics Cards */}
            {showStats && <YatraStats />}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Search
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                            placeholder="Search by title or description..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={filters.status || ''}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="open">Open</option>
                            <option value="full">Full</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Theme Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Theme
                        </label>
                        <select
                            value={filters.theme || ''}
                            onChange={(e) => setFilters({ ...filters, theme: e.target.value || undefined, page: 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Themes</option>
                            <option value="vrindavan">Vrindavan</option>
                            <option value="mayapur">Mayapur</option>
                            <option value="kumbh_mela">Kumbh Mela</option>
                            <option value="char_dham">Char Dham</option>
                            <option value="kartik">Kartik</option>
                            <option value="parikrama">Parikrama</option>
                            <option value="general">General</option>
                        </select>
                    </div>
                </div>

                {/* Toggle Filters */}
                <div className="mt-4 flex flex-wrap gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.includeDrafts}
                            onChange={(e) => setFilters({ ...filters, includeDrafts: e.target.checked, page: 1 })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Include Drafts</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.includeCancelled}
                            onChange={(e) => setFilters({ ...filters, includeCancelled: e.target.checked, page: 1 })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Include Cancelled</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.includeCompleted}
                            onChange={(e) => setFilters({ ...filters, includeCompleted: e.target.checked, page: 1 })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Include Completed</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.reportedOnly}
                            onChange={(e) => setFilters({ ...filters, reportedOnly: e.target.checked, page: 1 })}
                            className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                        />
                        <span className="text-sm text-red-700 font-medium">⚠️ Reported Only</span>
                    </label>
                </div>
            </div>

            {/* Yatra Table */}
            <YatraTable filters={filters} onPageChange={(page) => setFilters({ ...filters, page })} />
        </div>
    );
}
