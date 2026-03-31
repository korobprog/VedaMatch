'use client';

import { ReactNode } from 'react';
import {
  LILA_CATEGORIES,
  LILA_DIFFICULTIES,
  LILA_LOCALES,
  LILA_MODES,
  LILA_PUBLISH_STATES,
  LILA_QUESTION_TYPES,
  LilaGameMode,
  LilaLocale,
  LilaQuestion,
} from './lilaData';

type Props = {
  value: LilaQuestion;
  onChange: (next: LilaQuestion) => void;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
  dangerLabel?: string;
};

const localeLabel: Record<LilaLocale, string> = {
  ru: 'Russian',
  en: 'English',
  hi: 'Hindi',
};

export default function LilaQuestionEditor({ value, onChange, onSave, onReset, onDelete, dangerLabel = 'Archive question' }: Props) {
  const updateField = <K extends keyof LilaQuestion>(key: K, nextValue: LilaQuestion[K]) => {
    onChange({ ...value, [key]: nextValue, updatedAt: new Date().toISOString() });
  };

  const updateLocaleField = (locale: LilaLocale, key: 'prompt' | 'explanation', text: string) => {
    onChange({
      ...value,
      [key]: {
        ...value[key],
        [locale]: text,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const updateLocaleOptions = (locale: LilaLocale, text: string) => {
    onChange({
      ...value,
      options: {
        ...value.options,
        [locale]: text.split('\n').map((line) => line.trim()).filter(Boolean),
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleMode = (mode: LilaGameMode) => {
    const nextModes = value.modes.includes(mode)
      ? value.modes.filter((item) => item !== mode)
      : [...value.modes, mode];
    updateField('modes', nextModes);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Question editor</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">All editorial fields required for launch are visible here.</p>
          </div>
          <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            {value.status.toUpperCase()}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Slug">
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.slug} onChange={(e) => updateField('slug', e.target.value)} />
          </Field>
          <Field label="Asset URL / placeholder">
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.assetUrl} onChange={(e) => updateField('assetUrl', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Question type">
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.type} onChange={(e) => updateField('type', e.target.value as LilaQuestion['type'])}>
              {LILA_QUESTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Publish state">
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.status} onChange={(e) => updateField('status', e.target.value as LilaQuestion['status'])}>
              {LILA_PUBLISH_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.category} onChange={(e) => updateField('category', e.target.value as LilaQuestion['category'])}>
              {LILA_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.difficulty} onChange={(e) => updateField('difficulty', e.target.value as LilaQuestion['difficulty'])}>
              {LILA_DIFFICULTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Answer key">
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.answerKey} onChange={(e) => updateField('answerKey', e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Mode compatibility</div>
          <div className="flex flex-wrap gap-3">
            {LILA_MODES.map((mode) => (
              <label key={mode.value} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${value.modes.includes(mode.value) ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                <input type="checkbox" className="accent-violet-600" checked={value.modes.includes(mode.value)} onChange={() => toggleMode(mode.value)} />
                {mode.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {LILA_LOCALES.map((locale) => (
            <div key={locale} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{localeLabel[locale]}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Prompt, options, and explanation</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{locale.toUpperCase()}</span>
              </div>

              <Field label="Prompt">
                <textarea className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.prompt[locale]} onChange={(e) => updateLocaleField(locale, 'prompt', e.target.value)} />
              </Field>

              <Field label="Options (one per line)">
                <textarea className="h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.options[locale].join('\n')} onChange={(e) => updateLocaleOptions(locale, e.target.value)} />
              </Field>

              <Field label="Explanation">
                <textarea className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" value={value.explanation[locale]} onChange={(e) => updateLocaleField(locale, 'explanation', e.target.value)} />
              </Field>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onSave} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500">Save question</button>
          <button onClick={onReset} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Reset editor</button>
          <button onClick={onDelete} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30">{dangerLabel}</button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Asset placeholder</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Use this for image-based questions and art references.</p>
          </div>
          <div className="p-5">
            <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-violet-300 bg-gradient-to-br from-violet-50 via-white to-amber-50 dark:border-violet-700 dark:from-violet-950 dark:via-slate-900 dark:to-amber-950">
              {value.assetUrl ? (
                <div className="text-center">
                  <div className="mb-2 text-xs uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300">asset preview</div>
                  <div className="rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {value.assetUrl}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">No asset attached</div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Add an image URL, artwork placeholder, or external media reference.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Current metadata</h3>
          <div className="mt-4 space-y-3 text-sm">
            <MetaRow label="Slug" value={value.slug} />
            <MetaRow label="Question type" value={value.type} />
            <MetaRow label="Category" value={value.category} />
            <MetaRow label="Difficulty" value={value.difficulty} />
            <MetaRow label="Modes" value={value.modes.join(', ')} />
            <MetaRow label="Updated" value={new Date(value.updatedAt).toLocaleString()} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</div>
      {children}
    </label>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="max-w-[60%] truncate font-medium text-slate-900 dark:text-white">{value || '—'}</span>
    </div>
  );
}
