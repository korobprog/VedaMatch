'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Save, Store, Ticket, Gift, ShieldCheck } from 'lucide-react';
import {
  DharmaFundCard,
  GiftBundleGrid,
  LilaConfigPanel,
  PassConfigCard,
  StoreCatalogCard,
  SubscriptionConfigCard,
} from '@/components/games/lila/LilaOpsPanels';
import api from '@/lib/api';
import type { LilaAdminLiveOpsResponse, LilaAdminPassSeasonRecord, LilaAdminStoreItemRecord } from '@/lib/lila-admin';

export default function LilaLiveOpsPage() {
  const [saved, setSaved] = useState('Loading live ops configuration...');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeItemsText, setStoreItemsText] = useState('[]');
  const [passSeasonsText, setPassSeasonsText] = useState('[]');
  const [dharmaPercent, setDharmaPercent] = useState(0);

  useEffect(() => {
    void loadLiveOps();
  }, []);

  const loadLiveOps = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/games/lila/live-ops');
      const payload = normalizeLiveOpsResponse(response.data);
      setStoreItemsText(JSON.stringify(payload.storeItems, null, 2));
      setPassSeasonsText(JSON.stringify(payload.passSeasons, null, 2));
      setDharmaPercent(payload.dharmaPercent || 0);
      setSaved('Live ops configuration synced from backend');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load live ops';
      setSaved(message);
    } finally {
      setLoading(false);
    }
  };

  const parsedStoreItems = useMemo(() => safeParseArray<LilaAdminStoreItemRecord>(storeItemsText), [storeItemsText]);
  const parsedPassSeasons = useMemo(() => safeParseArray<LilaAdminPassSeasonRecord>(passSeasonsText), [passSeasonsText]);
  const storeItems = parsedStoreItems || [];
  const passSeasons = parsedPassSeasons || [];

  const storeCatalog = storeItems.map((item) => ({
    id: item.code,
    name: item.nameEn || item.nameRu || item.code,
    description: item.descriptionEn || item.descriptionRu || '',
    bonusPrice: Number(item.priceBonus || 0),
    realPrice: Number(item.priceReal || 0),
    isActive: (item.status || 'draft') === 'active',
  }));

  const subscriptionItem = storeItems.find((item) => item.type === 'subscription');
  const giftItems = storeItems.filter((item) => item.type === 'gift').map((item) => ({
    id: item.code,
    title: item.nameEn || item.code,
    realPrice: Number(item.priceReal || 0),
    bonusGift: Number(item.priceBonus || 0),
    note: item.descriptionEn || item.descriptionRu || '',
  }));
  const activeSeason = passSeasons.find((item) => item.status === 'active') || passSeasons[0];

  const saveLiveOps = async () => {
    setSaving(true);
    try {
      if (!parsedStoreItems || !parsedPassSeasons) {
        setSaved('Store items or pass seasons JSON is invalid');
        return;
      }
      await api.put('/admin/games/lila/live-ops', {
        storeItems: parsedStoreItems,
        passSeasons: parsedPassSeasons,
        dharmaPercent,
      });
      await loadLiveOps();
      setSaved('Configuration saved to backend');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to save live ops';
      setSaved(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <LilaConfigPanel title="Store catalog" subtitle="Cosmetics, siddhi consumables, and tournament access">
          <StoreCatalogCard items={storeCatalog} />
        </LilaConfigPanel>

        <LilaConfigPanel title="Sadhana Pass" subtitle="Seasonal progression and rewards">
          <PassConfigCard
            config={{
              seasonName: activeSeason?.nameEn || 'No active season',
              durationDays: activeSeason ? diffDays(activeSeason.startsAt, activeSeason.endsAt) : 0,
              premiumPriceReal: Number(activeSeason?.premiumPriceReal || 0),
              freeTrackTitle: 'Free track',
              premiumTrackTitle: 'Premium track',
              rewardHighlights: activeSeason ? [activeSeason.descriptionEn || activeSeason.descriptionRu || activeSeason.code] : ['No season loaded'],
            }}
          />
        </LilaConfigPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LilaConfigPanel title="Bhakti Premium" subtitle="Subscription entitlement and queue priority">
          <SubscriptionConfigCard
            config={{
              title: subscriptionItem?.nameEn || 'Bhakti Premium',
              monthlyPriceReal: Number(subscriptionItem?.priceReal || 0),
              bonusDaily: Number(subscriptionItem?.priceBonus || 0),
              adFree: true,
              extraMatchmakingPriority: true,
            }}
          />
        </LilaConfigPanel>

        <LilaConfigPanel title="Gifting" subtitle="Bundles for friends, guru-shishya, and festival sharing">
          <GiftBundleGrid gifts={giftItems} />
        </LilaConfigPanel>
      </div>

      <LilaConfigPanel title="Dharma Fund" subtitle="Internal allocation settings for charitable accounting">
        <DharmaFundCard
          config={{
            percentBps: dharmaPercent * 100,
            enabled: dharmaPercent > 0,
            internalLedgerLabel: 'Dharma Fund reserve',
            note: 'Backend stores the percentage on real-money Lila catalog items and records allocations per purchase.',
          }}
        />
      </LilaConfigPanel>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Live ops notes</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">JSON editors below are bound to `/api/admin/games/lila/live-ops` and persist the exact backend payload.</p>
          </div>
          <button onClick={saveLiveOps} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save snapshot'}
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Note icon={<Store className="h-4 w-4" />} title="Store" text="Real and bonus currency split" />
          <Note icon={<Ticket className="h-4 w-4" />} title="Pass" text="Season rewards and progression" />
          <Note icon={<Gift className="h-4 w-4" />} title="Gifts" text="Bundles and celebratory offers" />
          <Note icon={<ShieldCheck className="h-4 w-4" />} title="Dharma Fund" text="Internal reserve accounting" />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          {loading ? 'Loading...' : saved}
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <JsonEditor
            label="Store items JSON"
            value={storeItemsText}
            onChange={setStoreItemsText}
            hint="Edit multilingual catalog entries, prices, types, featured flags, and per-item meta."
          />
          <JsonEditor
            label="Pass seasons JSON"
            value={passSeasonsText}
            onChange={setPassSeasonsText}
            hint="Edit season names, windows, premium price, daily bonus JSON, and reward metadata."
          />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <label className="block">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Dharma percent</div>
            <input
              type="number"
              min={0}
              max={100}
              value={dharmaPercent}
              onChange={(event) => setDharmaPercent(Number(event.target.value || 0))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function normalizeLiveOpsResponse(value: any): LilaAdminLiveOpsResponse {
  return {
    storeItems: Array.isArray(value?.storeItems) ? value.storeItems : [],
    passSeasons: Array.isArray(value?.passSeasons) ? value.passSeasons : [],
    dharmaPercent: Number(value?.dharmaPercent || 0),
  };
}

function safeParseArray<T>(raw: string): T[] | null {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function diffDays(startsAt?: string, endsAt?: string): number {
  if (!startsAt || !endsAt) {
    return 0;
  }
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function JsonEditor({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{label}</div>
      <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">{hint}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-72 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function Note({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <span className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-200">{icon}</span>
        {title}
      </div>
      <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">{text}</div>
    </div>
  );
}
