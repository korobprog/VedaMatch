'use client';

import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';

export function PortalPageShell({
    eyebrow,
    title,
    description,
    children,
    actions,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-[#0a0a0c] px-5 py-8 text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-orange-500/10 blur-[110px]" />
                <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-[110px]" />
            </div>
            <div className="relative z-10 mx-auto max-w-6xl">
                <Link href="/user/dashboard" className="mb-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/65 transition hover:bg-white/10 hover:text-white">
                    <ChevronLeft className="h-4 w-4" />
                    Назад в портал
                </Link>
                <header className="mb-8 flex flex-col gap-5 rounded-[32px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/20 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-orange-400">{eyebrow}</p>
                        <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">{title}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 md:text-base">{description}</p>
                    </div>
                    {actions}
                </header>
                {children}
            </div>
        </main>
    );
}

export function PortalLoadingState({ label = 'Загружаем данные...' }: { label?: string }) {
    return (
        <div className="flex min-h-[280px] items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.03] text-white/55">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-orange-400" />
            {label}
        </div>
    );
}

export function PortalEmptyState({ title, description }: { title: string; description: string }) {
    return (
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-10 text-center">
            <h2 className="text-xl font-black text-white">{title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">{description}</p>
        </div>
    );
}

export function PortalErrorState({ message }: { message: string }) {
    return (
        <div className="rounded-[32px] border border-red-400/20 bg-red-500/10 p-6 text-sm font-bold text-red-100">
            {message}
        </div>
    );
}

export const normalizeImageUrl = (rawUrl?: string | null): string => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('//')) return 'https:' + value;
    return value.startsWith('/') ? value : '/' + value;
};
