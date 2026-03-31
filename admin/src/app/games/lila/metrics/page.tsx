'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, RefreshCcw, ShieldAlert } from 'lucide-react';
import { LilaQuestion } from '@/components/games/lila/lilaData';
import { MetricGrid, ModerationTable } from '@/components/games/lila/LilaMetricsPanels';
import api from '@/lib/api';
import { formatMetrics, formatModerationItems, LilaAdminMetricsSnapshot, mapApiQuestionToDraft } from '@/lib/lila-admin';

export default function LilaMetricsPage() {
  const router = useRouter();
  const [notice, setNotice] = useState('Loading metrics...');
  const [metrics, setMetrics] = useState<LilaAdminMetricsSnapshot | null>(null);
  const [questions, setQuestions] = useState<LilaQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [metricsResponse, questionsResponse] = await Promise.all([
        api.get('/admin/games/lila/metrics'),
        api.get('/admin/games/lila/questions'),
      ]);
      setMetrics(metricsResponse.data || {});
      setQuestions((questionsResponse.data?.questions || []).map(mapApiQuestionToDraft));
      setNotice(`Last refreshed at ${new Date().toLocaleString()}`);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load metrics';
      setNotice(message);
    } finally {
      setLoading(false);
    }
  };

  const moderationItems = useMemo(() => formatModerationItems(questions), [questions]);
  const metricItems = useMemo(() => formatMetrics(metrics), [metrics]);

  const quickPublish = async (questionId: string) => {
    try {
      await api.post(`/admin/games/lila/questions/${questionId}/publish`);
      await loadMetrics();
      setNotice('Question published from moderation queue');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to publish question';
      setNotice(message);
    }
  };

  return (
    <div className="space-y-6">
      <MetricGrid items={metricItems} />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Health checks</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Queue depth, latency, disconnects, and settlement failures.</p>
            </div>
            <button onClick={() => void loadMetrics()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <HealthCard title="Finished today" value={String(metrics?.finishedMatchesToday || 0)} tone="good" />
            <HealthCard title="Reconnect count" value={String(metrics?.reconnects || 0)} tone="warn" />
            <HealthCard title="Settlement failures" value={String(metrics?.settlementFailures || 0)} tone="bad" />
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {loading ? 'Loading...' : notice}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Moderation shell
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use this area for editorial decisions, publish approvals, and content safety review.</p>
          <div className="mt-4 space-y-3">
            {moderationItems.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{item.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.questionSlug}</div>
                  </div>
                  <StatePill state={item.status} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => void quickPublish(item.id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button onClick={() => router.push('/games/lila/questions')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ModerationTable items={moderationItems} />
    </div>
  );
}

function HealthCard({ title, value, tone }: { title: string; value: string; tone: 'good' | 'warn' | 'bad' }) {
  const toneClass =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
      <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatePill({ state }: { state: 'pending' | 'reviewed' | 'rejected' }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
    reviewed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  } as const;

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[state]}`}>{state}</span>;
}
