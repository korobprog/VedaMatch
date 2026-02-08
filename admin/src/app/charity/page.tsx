'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    DollarSign,
    TrendingUp,
    Loader2,
    AlertCircle,
    ExternalLink,
    Mail,
    Globe,
    FileText,
    Heart
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
        draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Draft' },
        pending: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-600', label: 'Pending' },
        verified: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600', label: 'Verified' },
        blocked: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600', label: 'Blocked' },
        moderation: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600', label: 'Moderation' },
        active: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600', label: 'Active' },
        paused: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600', label: 'Paused' },
        completed: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600', label: 'Completed' },
    };
    const c = config[status] || config.draft;
    return (
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${c.bg} ${c.text}`}>
            {c.label}
        </span>
    );
};

// Stats Card
const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
    <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
        </div>
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
);

export default function CharityAdminPage() {
    const [tab, setTab] = useState<'organizations' | 'projects'>('organizations');
    const [orgStatus, setOrgStatus] = useState('pending');
    const [projectStatus, setProjectStatus] = useState('moderation');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { data: stats, error: statsError } = useSWR('/admin/charity/stats', fetcher);
    const { data: orgsData, mutate: mutateOrgs } = useSWR(
        `/admin/charity/organizations?status=${orgStatus}`,
        fetcher
    );
    const { data: projectsData, mutate: mutateProjects } = useSWR(
        `/admin/charity/projects?status=${projectStatus}`,
        fetcher
    );

    const organizations = orgsData?.organizations || [];
    const projects = projectsData?.projects || [];

    const handleApproveOrg = async (orgId: number) => {
        setActionLoading(`org-${orgId}`);
        try {
            await api.post(`/admin/charity/organizations/${orgId}/approve`);
            mutateOrgs();
        } catch (err) {
            console.error('Failed to approve organization', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectOrg = async (orgId: number) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        setActionLoading(`org-${orgId}`);
        try {
            await api.post(`/admin/charity/organizations/${orgId}/reject`, { reason });
            mutateOrgs();
        } catch (err) {
            console.error('Failed to reject organization', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveProject = async (projectId: number) => {
        setActionLoading(`project-${projectId}`);
        try {
            await api.post(`/admin/charity/projects/${projectId}/approve`);
            mutateProjects();
        } catch (err) {
            console.error('Failed to approve project', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectProject = async (projectId: number) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        setActionLoading(`project-${projectId}`);
        try {
            await api.post(`/admin/charity/projects/${projectId}/reject`, { reason });
            mutateProjects();
        } catch (err) {
            console.error('Failed to reject project', err);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Heart className="w-8 h-8 text-pink-500" />
                        Charity Moderation
                    </h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Manage organizations and fundraising projects</p>
                </div>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={Building2}
                        label="Organizations"
                        value={stats.totalOrganizations}
                        color="bg-blue-100 dark:bg-blue-900/20 text-blue-600"
                    />
                    <StatCard
                        icon={Clock}
                        label="Pending Orgs"
                        value={stats.pendingOrganizations}
                        color="bg-amber-100 dark:bg-amber-900/20 text-amber-600"
                    />
                    <StatCard
                        icon={FileText}
                        label="Active Projects"
                        value={stats.activeProjects}
                        color="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Total Raised"
                        value={stats.totalRaised}
                        color="bg-purple-100 dark:bg-purple-900/20 text-purple-600"
                    />
                </div>
            )}

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-[var(--secondary)] p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setTab('organizations')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'organizations'
                        ? 'bg-[var(--card)] shadow-sm'
                        : 'hover:bg-[var(--card)]/50'
                        }`}
                >
                    Organizations {stats?.pendingOrganizations > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                            {stats.pendingOrganizations}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('projects')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'projects'
                        ? 'bg-[var(--card)] shadow-sm'
                        : 'hover:bg-[var(--card)]/50'
                        }`}
                >
                    Projects {stats?.pendingProjects > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                            {stats.pendingProjects}
                        </span>
                    )}
                </button>
            </div>

            {/* Organizations Tab */}
            {tab === 'organizations' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        {['pending', 'verified', 'blocked', 'all'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setOrgStatus(s)}
                                className={`px-4 py-2 text-sm rounded-xl ${orgStatus === s
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--secondary)] hover:bg-[var(--card)]'
                                    }`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Organization</th>
                                    <th className="px-6 py-4 font-semibold">Contact</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Stats</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {organizations.map((org: any) => (
                                        <motion.tr
                                            key={org.ID}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-[var(--secondary)]/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-[var(--secondary)] rounded-xl flex items-center justify-center border border-[var(--border)] overflow-hidden">
                                                        {org.logoUrl ? (
                                                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Building2 className="w-6 h-6 text-[var(--muted-foreground)]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{org.name}</p>
                                                        <p className="text-xs text-[var(--muted-foreground)]">{org.country}, {org.city}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {org.email && (
                                                        <p className="text-xs flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {org.email}
                                                        </p>
                                                    )}
                                                    {org.website && (
                                                        <a
                                                            href={org.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs flex items-center gap-1 text-blue-500 hover:underline"
                                                        >
                                                            <Globe className="w-3 h-3" /> Website
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={org.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs space-y-1">
                                                    <p>Projects: {org.totalProjects || 0}</p>
                                                    <p>Raised: {(org.totalRaised || 0).toLocaleString()} LKM</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {org.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApproveOrg(org.ID)}
                                                                disabled={actionLoading === `org-${org.ID}`}
                                                                className="p-2 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-all"
                                                                title="Approve"
                                                            >
                                                                {actionLoading === `org-${org.ID}` ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectOrg(org.ID)}
                                                                disabled={actionLoading === `org-${org.ID}`}
                                                                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                                                                title="Reject"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {organizations.length === 0 && (
                            <div className="p-12 text-center text-[var(--muted-foreground)]">
                                No organizations found with status "{orgStatus}"
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Projects Tab */}
            {tab === 'projects' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        {['moderation', 'active', 'paused', 'blocked', 'all'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setProjectStatus(s)}
                                className={`px-4 py-2 text-sm rounded-xl ${projectStatus === s
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--secondary)] hover:bg-[var(--card)]'
                                    }`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Project</th>
                                    <th className="px-6 py-4 font-semibold">Organization</th>
                                    <th className="px-6 py-4 font-semibold">Goal</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {projects.map((project: any) => (
                                        <motion.tr
                                            key={project.ID}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-[var(--secondary)]/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-16 h-12 bg-[var(--secondary)] rounded-lg overflow-hidden border border-[var(--border)]">
                                                        {project.coverUrl ? (
                                                            <img src={project.coverUrl} alt={project.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold line-clamp-1">{project.title}</p>
                                                        <p className="text-xs text-[var(--muted-foreground)]">{project.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm">{project.Organization?.name || 'Unknown'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    <p className="font-semibold">{(project.goalAmount || 0).toLocaleString()} LKM</p>
                                                    <p className="text-xs text-[var(--muted-foreground)]">
                                                        Raised: {(project.raisedAmount || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={project.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {project.status === 'moderation' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApproveProject(project.ID)}
                                                                disabled={actionLoading === `project-${project.ID}`}
                                                                className="p-2 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-all"
                                                                title="Approve"
                                                            >
                                                                {actionLoading === `project-${project.ID}` ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectProject(project.ID)}
                                                                disabled={actionLoading === `project-${project.ID}`}
                                                                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                                                                title="Reject"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {projects.length === 0 && (
                            <div className="p-12 text-center text-[var(--muted-foreground)]">
                                No projects found with status "{projectStatus}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
