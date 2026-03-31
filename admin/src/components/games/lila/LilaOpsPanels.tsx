'use client';

import { ReactNode } from 'react';
import { LilaDharmaFundConfig, LilaGiftBundle, LilaPassConfig, LilaStoreItem, LilaSubscriptionConfig } from './lilaData';

export function LilaConfigPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
      {footer ? <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">{footer}</div> : null}
    </section>
  );
}

export function StoreCatalogCard({ items }: { items: LilaStoreItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{item.description}</div>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
              {item.isActive ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Bonus" value={`${item.bonusPrice} LKM`} />
            <Metric label="Real" value={item.realPrice ? `${item.realPrice} LKM` : 'Free'} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function PassConfigCard({ config }: { config: LilaPassConfig }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="text-sm uppercase tracking-[0.3em] text-violet-500">Season</div>
        <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{config.seasonName}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Duration" value={`${config.durationDays} days`} />
          <Metric label="Premium price" value={`${config.premiumPriceReal} LKM`} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{config.freeTrackTitle} / {config.premiumTrackTitle}</div>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {config.rewardHighlights.map((item) => <li key={item} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500" />{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

export function SubscriptionConfigCard({ config }: { config: LilaSubscriptionConfig }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Plan" value={config.title} />
      <Metric label="Monthly price" value={`${config.monthlyPriceReal} LKM`} />
      <Metric label="Daily bonus" value={`${config.bonusDaily} bonus`} />
      <ToggleMetric label="Ad free" value={config.adFree ? 'Enabled' : 'Disabled'} />
      <ToggleMetric label="Priority queue" value={config.extraMatchmakingPriority ? 'Enabled' : 'Disabled'} />
      <ToggleMetric label="Bundle ready" value="Configured" />
    </div>
  );
}

export function GiftBundleGrid({ gifts }: { gifts: LilaGiftBundle[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {gifts.map((gift) => (
        <article key={gift.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="font-semibold text-slate-900 dark:text-white">{gift.title}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{gift.note}</div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Real price</span>
            <span className="font-semibold text-slate-900 dark:text-white">{gift.realPrice} LKM</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Bonus gift</span>
            <span className="font-semibold text-violet-700 dark:text-violet-200">{gift.bonusGift}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function DharmaFundCard({ config }: { config: LilaDharmaFundConfig }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="text-sm uppercase tracking-[0.3em] text-amber-600">Dharma Fund</div>
        <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{config.internalLedgerLabel}</div>
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{config.note}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <Metric label="Allocation" value={`${config.percentBps / 100}%`} />
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">Enable this once backend accounting endpoints are wired.</div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function ToggleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
