'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, PlayCircle, ShieldCheck, Sparkles, Swords, Trophy } from 'lucide-react';
import { LilaQuestion } from '@/components/games/lila/lilaData';
import { MetricGrid, ModerationTable } from '@/components/games/lila/LilaMetricsPanels';
import Link from 'next/link';
import api from '@/lib/api';
import { formatMetrics, formatModerationItems, LilaAdminMetricsSnapshot, mapApiQuestionToDraft } from '@/lib/lila-admin';

const launchModes = [
  { title: 'Dharma Duel', desc: '1v1 fast rounds with karma transfer', icon: <Swords className="h-5 w-5" /> },
  { title: 'Sabha', desc: 'Team queue and answer assembly', icon: <ShieldCheck className="h-5 w-5" /> },
  { title: 'Survival in Samsara', desc: 'Elimination ladder for the last sage standing', icon: <Trophy className="h-5 w-5" /> },
];

export default function LilaOverviewPage() {
  const [metrics, setMetrics] = useState<LilaAdminMetricsSnapshot | null>(null);
  const [questions, setQuestions] = useState<LilaQuestion[]>([]);
  const [notice, setNotice] = useState('Loading Lila ops snapshot...');

  useEffect(() => {
    void loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const [metricsResponse, questionsResponse] = await Promise.all([
        api.get('/admin/games/lila/metrics'),
        api.get('/admin/games/lila/questions'),
      ]);
      setMetrics(metricsResponse.data || {});
      setQuestions((questionsResponse.data?.questions || []).map(mapApiQuestionToDraft));
      setNotice('Backend metrics and editorial queue are live');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load overview';
      setNotice(message);
    }
  };

  const moderationItems = useMemo(() => formatModerationItems(questions), [questions]);
  const metricItems = useMemo(() => formatMetrics(metrics), [metrics]);
  const questionBank = questions.slice(0, 4);
  const activeCount = questions.filter((item) => item.status === 'active').length;
  const reviewCount = questions.filter((item) => item.status === 'review').length;

  return (
    <div className="space-y-6">
      <MetricGrid items={metricItems} />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Launch readiness</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Core paths ready for the first online playable version.</p>
            </div>
            <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              MVP scaffold
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {launchModes.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-200">
                  {item.icon}
                </div>
                <div className="mt-4 font-semibold text-slate-900 dark:text-white">{item.title}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.desc}</div>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Callout
              title="Editorial scope"
              text={`${questions.length} total questions · ${activeCount} published · ${reviewCount} in review.`}
            />
            <Callout
              title="Economy scope"
              text="Store catalog, Sadhana Pass, Bhakti Premium, gifts, and Dharma Fund controls are bound to live backend config."
            />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Question bank</h3>
              <Sparkles className="h-5 w-5 text-violet-500" />
            </div>
            <div className="mt-4 space-y-3">
              {questionBank.map((question) => (
                <div key={String(question.id)} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{question.prompt.en || question.prompt.ru || question.slug}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{question.slug} · {question.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Runtime status
            </div>
            <p className="mt-2 text-sm leading-6">
              {notice}
            </p>
          </div>
        </aside>
      </div>

      <ModerationTable items={moderationItems} />

      <div className="flex justify-end">
        <Link href="/games/lila/questions" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500">
          <PlayCircle className="h-4 w-4" />
          Open question editor
        </Link>
      </div>
    </div>
  );
}

function Callout({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="font-semibold text-slate-900 dark:text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</div>
    </div>
  );
}
