'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ChevronRight, Crown, Sword, Telescope, ScrollText } from 'lucide-react';

type LilaNavItem = {
  href: string;
  label: string;
  hint: string;
  icon: ReactNode;
};

const navItems: LilaNavItem[] = [
  { href: '/games/lila', label: 'Overview', hint: 'Dashboard and ops summary', icon: <Crown className="h-4 w-4" /> },
  { href: '/games/lila/questions', label: 'Questions', hint: 'Multilingual CRUD editor', icon: <ScrollText className="h-4 w-4" /> },
  { href: '/games/lila/live-ops', label: 'Live Ops', hint: 'Store, pass and money flow', icon: <Sword className="h-4 w-4" /> },
  { href: '/games/lila/metrics', label: 'Metrics', hint: 'Queue and moderation health', icon: <Telescope className="h-4 w-4" /> },
];

export default function LilaAdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 shadow-2xl shadow-violet-950/30">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.4fr_0.8fr] lg:px-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">
                Lila: Battle of Sages
              </div>
              <h1 className="max-w-2xl text-3xl font-black tracking-tight text-white md:text-5xl">
                Admin control room for questions, economy, and live operations
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                This subtree is isolated from the global admin shell. It provides a scaffold for multilingual question CRUD,
                monetization settings, moderation review, and runtime telemetry.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                <Badge label="ru/en/hi content" />
                <Badge label="Dharma Duel" />
                <Badge label="Sabha" />
                <Badge label="Survival in Samsara" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-violet-200/70">Launch scope</div>
                  <div className="mt-2 text-xl font-bold text-white">Question bank + Live Ops</div>
                </div>
                <div className="rounded-full bg-violet-400/15 p-3 text-violet-200">
                  <Crown className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <StatRow label="Questions" value="Multilingual editor" />
                <StatRow label="Economy" value="Store, pass, gifts, Dharma Fund" />
                <StatRow label="Ops" value="Metrics and moderation" />
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 px-4 py-4 lg:px-8">
            <nav className="grid gap-3 md:grid-cols-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-violet-400/40 hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-500/15 p-2 text-violet-200">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.hint}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-violet-200" />
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">{label}</span>;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
