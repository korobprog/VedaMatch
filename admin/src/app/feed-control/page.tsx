'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Save, Server, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

type FeedConfig = Record<string, string>;
type FeedMetrics = Record<string, number>;

const DEFAULT_CONFIG: FeedConfig = {
  FEED_V2_ENABLED: 'false',
  FEED_V2_ROLLOUT_PERCENT: '5',
  FEED_RANK_WEIGHTS_JSON: '{"recency":0.62,"engagement":0.24,"proBoost":0.14}',
  FEED_CACHE_TTL_SEC: '90',
  FEED_CIRCLE_MIX_RATIO: '0.35',
};

export default function FeedControlPage() {
  const [config, setConfig] = useState<FeedConfig>(DEFAULT_CONFIG);
  const [metrics, setMetrics] = useState<FeedMetrics>({});
  const [health, setHealth] = useState<any>(null);
  const [workersHealth, setWorkersHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  const rolloutHint = useMemo(() => {
    const value = Number(config.FEED_V2_ROLLOUT_PERCENT || 0);
    if (!Number.isFinite(value)) return 'Некорректный rollout';
    if (value <= 5) return 'Canary';
    if (value < 100) return 'Partial rollout';
    return 'Full rollout';
  }, [config.FEED_V2_ROLLOUT_PERCENT]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, metricsRes, healthRes, workersRes] = await Promise.all([
        api.get('/admin/feed/config'),
        api.get('/admin/feed/metrics'),
        api.get('/admin/feed/cdn-health'),
        api.get('/admin/feed/workers-health'),
      ]);
      setConfig({ ...DEFAULT_CONFIG, ...(cfgRes.data || {}) });
      setMetrics(metricsRes.data || {});
      setHealth(healthRes.data || null);
      setWorkersHealth(workersRes.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/admin/feed/config', config);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const rebuild = async () => {
    setRebuilding(true);
    try {
      await api.post('/admin/feed/rebuild?scope=page1');
      await loadAll();
    } finally {
      setRebuilding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading feed control...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feed Control</h1>
          <p className="text-sm text-slate-500 mt-1">Управление feed v2, rollout и CDN/Storage health.</p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-600" />
          <h2 className="font-semibold">Feed v2 Config</h2>
        </div>
        {Object.keys(DEFAULT_CONFIG).map((key) => (
          <label key={key} className="block">
            <div className="text-xs text-slate-500 mb-1">{key}</div>
            <input
              value={config[key] ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        ))}
        <div className="text-xs text-slate-500">Rollout mode: {rolloutHint}</div>
        <div className="flex gap-2">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save config
          </button>
          <button
            onClick={rebuild}
            disabled={rebuilding}
            className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            {rebuilding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Rebuild page1
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold">CDN / Storage health</h2>
        </div>
        <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(health, null, 2)}</pre>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold">Workers health</h2>
        </div>
        <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(workersHealth, null, 2)}</pre>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Feed Metrics</h2>
        <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(metrics, null, 2)}</pre>
      </section>
    </div>
  );
}
