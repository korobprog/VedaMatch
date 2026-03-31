'use client';

import { LilaMetric, LilaModerationItem } from './lilaData';

export function MetricGrid({ items }: { items: LilaMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500 dark:text-slate-400">{item.label}</div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{item.value}</div>
          <div className="mt-2 text-sm text-violet-600 dark:text-violet-300">{item.trend}</div>
        </article>
      ))}
    </div>
  );
}

export function ModerationTable({ items }: { items: LilaModerationItem[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Moderation queue</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Question review, publish checks, and editorial decisions.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr className="text-left text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              <th className="px-5 py-3">Question</th>
              <th className="px-5 py-3">Author</th>
              <th className="px-5 py-3">State</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item) => (
              <tr key={item.id} className="text-sm">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900 dark:text-white">{item.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.questionSlug}</div>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{item.author}</td>
                <td className="px-5 py-4">
                  <StatePill state={item.status} />
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatePill({ state }: { state: LilaModerationItem['status'] }) {
  const classes =
    state === 'pending'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
      : state === 'reviewed'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{state}</span>;
}
