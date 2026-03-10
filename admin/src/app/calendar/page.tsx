'use client';

import { getApiBaseURL } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearAuthData, getAuthToken } from '../../lib/auth';
import { useRouter } from 'next/navigation';

type EkadashiSummary = {
    totalEvents?: number;
    successEvents?: number;
    failedEvents?: number;
};

type CalendarPublication = {
    id: number;
    organizationId: string;
    scopeKey: string;
    scopeMode: string;
    timezone: string;
    city?: string;
    country?: string;
    publicationVersion: string;
    importRunID?: number;
    isActive: boolean;
    rangeStart: string;
    rangeEnd: string;
    eventsCount: number;
    lastSuccessAt?: string;
    createdAt: string;
};

type CalendarImportRun = {
    id: number;
    organizationId: string;
    scopeKey: string;
    scopeMode: string;
    timezone: string;
    city?: string;
    country?: string;
    importVersion: string;
    status: string;
    rangeStart: string;
    rangeEnd: string;
    importedCount: number;
    curatedCount: number;
    snapshotCount: number;
    errorMessage?: string;
    createdAt: string;
    finishedAt?: string;
    publishedAt?: string;
};

type EkadashiHealth = {
    status: string;
    summary?: EkadashiSummary;
    publications: CalendarPublication[];
    recentImportRuns: CalendarImportRun[];
    providerStatuses?: Record<string, any>;
};

const organizations = [
    { id: 'iskcon', name: 'ISKCON' },
    { id: 'sri_chaitanya_math', name: 'Sri Chaitanya Math' },
    { id: 'pure_bhakti', name: 'Pure Bhakti' },
    { id: 'default_vaishnava', name: 'Default Vaishnava' },
];

const formatDateTime = (value?: string) => {
    if (!value) return 'n/a';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
};

const formatScope = (item: { scopeMode?: string; scopeKey?: string; city?: string; timezone?: string }) => {
    if (item.scopeMode === 'location') {
        return `${item.city || 'city n/a'} / ${item.timezone || 'timezone n/a'}`;
    }
    return item.timezone || item.scopeKey || 'n/a';
};

export default function CalendarAdminPage() {
    const router = useRouter();
    const [health, setHealth] = useState<EkadashiHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [batchSubmitting, setBatchSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [organizationId, setOrganizationId] = useState('iskcon');
    const [city, setCity] = useState('Khabarovsk');
    const [country, setCountry] = useState('Russia');
    const [timezone, setTimezone] = useState('Asia/Vladivostok');

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuthData();
                router.push('/login');
                return;
            }
            const response = await fetch(`${getApiBaseURL()}/admin/push/health/ekadashi?window_hours=168&limit=50`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401) {
                clearAuthData();
                router.push('/login');
                return;
            }
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'Failed to load calendar health');
            }
            const payload = await response.json();
            setHealth(payload);
            setError(null);
        } catch (fetchError: any) {
            setError(fetchError?.message || 'Failed to load calendar health');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchHealth().catch(() => undefined);
    }, [fetchHealth]);

    const latestPublication = useMemo(
        () => health?.publications?.find((item) => item.isActive) || health?.publications?.[0] || null,
        [health],
    );

    const failedRuns = useMemo(
        () => (health?.recentImportRuns || []).filter((item) => item.status !== 'published'),
        [health],
    );

    const runImport = async (batch: boolean) => {
        const token = getAuthToken();
        if (!token) {
            clearAuthData();
            router.push('/login');
            return;
        }

        const params = new URLSearchParams({
            timezone,
            country,
        });
        if (city.trim()) {
            params.set('city', city.trim());
        }
        if (!batch) {
            params.set('organizationId', organizationId);
        }

        const endpoint = batch ? '/admin/ekadashi/refresh-all' : '/admin/ekadashi/refresh';
        const setPending = batch ? setBatchSubmitting : setSubmitting;
        setPending(true);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch(`${getApiBaseURL()}${endpoint}?${params.toString()}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401) {
                clearAuthData();
                router.push('/login');
                return;
            }
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error || 'Import failed');
            }
            setMessage(batch ? 'Batch import completed.' : 'Organization import completed.');
            await fetchHealth();
        } catch (submitError: any) {
            setError(submitError?.message || 'Import failed');
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
                    <p className="mt-1 text-gray-600">Published database status, import runs, and manual import controls for the Vedic calendar.</p>
                </div>
                <button
                    onClick={() => fetchHealth().catch(() => undefined)}
                    className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                    Refresh status
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Active publications</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{health?.publications?.filter((item) => item.isActive).length || 0}</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Recent failed runs</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{failedRuns.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Latest published</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{formatDateTime(latestPublication?.lastSuccessAt || latestPublication?.createdAt)}</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Push events (7d)</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{health?.summary?.totalEvents || 0}</p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="rounded-2xl border bg-white p-5">
                    <h2 className="text-lg font-semibold text-gray-900">Manual import</h2>
                    <p className="mt-1 text-sm text-gray-600">Choose a scope and publish calendar data ahead for 24 months.</p>

                    <div className="mt-5 space-y-4">
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Organization</span>
                            <select
                                value={organizationId}
                                onChange={(event) => setOrganizationId(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            >
                                {organizations.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">City</span>
                            <input
                                value={city}
                                onChange={(event) => setCity(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                placeholder="Required for ISKCON scopes"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Country</span>
                            <input
                                value={country}
                                onChange={(event) => setCountry(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Timezone</span>
                            <input
                                value={timezone}
                                onChange={(event) => setTimezone(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </label>
                    </div>

                    {message ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
                    {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

                    <div className="mt-5 flex flex-col gap-3">
                        <button
                            onClick={() => runImport(false).catch(() => undefined)}
                            disabled={submitting}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? 'Running import...' : 'Import selected organization'}
                        </button>
                        <button
                            onClick={() => runImport(true).catch(() => undefined)}
                            disabled={batchSubmitting}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {batchSubmitting ? 'Running batch import...' : 'Import all organizations for this scope'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border bg-white p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Active publications</h2>
                                <p className="text-sm text-gray-600">Current published versions served to mobile clients.</p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                {(health?.publications || []).length} total
                            </span>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-gray-500">
                                        <th className="px-3 py-2 font-medium">Organization</th>
                                        <th className="px-3 py-2 font-medium">Scope</th>
                                        <th className="px-3 py-2 font-medium">Range</th>
                                        <th className="px-3 py-2 font-medium">Events</th>
                                        <th className="px-3 py-2 font-medium">Published</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(health?.publications || []).map((item) => (
                                        <tr key={item.id} className="border-b last:border-b-0">
                                            <td className="px-3 py-2 font-medium text-gray-900">{item.organizationId}</td>
                                            <td className="px-3 py-2 text-gray-700">{formatScope(item)}</td>
                                            <td className="px-3 py-2 text-gray-700">{item.rangeStart} {'->'} {item.rangeEnd}</td>
                                            <td className="px-3 py-2 text-gray-700">{item.eventsCount}</td>
                                            <td className="px-3 py-2 text-gray-700">{formatDateTime(item.lastSuccessAt || item.createdAt)}</td>
                                        </tr>
                                    ))}
                                    {!loading && (health?.publications || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No published calendar versions yet.</td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Recent import runs</h2>
                                <p className="text-sm text-gray-600">Latest import attempts with success and failure details.</p>
                            </div>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-gray-500">
                                        <th className="px-3 py-2 font-medium">Status</th>
                                        <th className="px-3 py-2 font-medium">Organization</th>
                                        <th className="px-3 py-2 font-medium">Scope</th>
                                        <th className="px-3 py-2 font-medium">Counts</th>
                                        <th className="px-3 py-2 font-medium">Finished</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(health?.recentImportRuns || []).map((item) => (
                                        <tr key={item.id} className="border-b last:border-b-0 align-top">
                                            <td className="px-3 py-2">
                                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === 'published' ? 'bg-emerald-100 text-emerald-700' : item.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-medium text-gray-900">{item.organizationId}</td>
                                            <td className="px-3 py-2 text-gray-700">{formatScope(item)}</td>
                                            <td className="px-3 py-2 text-gray-700">
                                                imported {item.importedCount} / curated {item.curatedCount} / snapshots {item.snapshotCount}
                                                {item.errorMessage ? <div className="mt-1 text-xs text-red-600">{item.errorMessage}</div> : null}
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">{formatDateTime(item.finishedAt || item.publishedAt || item.createdAt)}</td>
                                        </tr>
                                    ))}
                                    {!loading && (health?.recentImportRuns || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No import runs yet.</td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
