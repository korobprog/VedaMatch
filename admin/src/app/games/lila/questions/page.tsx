'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Archive, CheckCircle2, Copy, Plus, RotateCcw, Rocket } from 'lucide-react';
import LilaQuestionEditor from '@/components/games/lila/LilaQuestionEditor';
import { LilaQuestion } from '@/components/games/lila/lilaData';
import api from '@/lib/api';
import { buildQuestionPayload, createLilaQuestionDraft, mapApiQuestionToDraft } from '@/lib/lila-admin';

const cloneQuestion = (question: LilaQuestion): LilaQuestion => ({
  ...question,
  prompt: { ...question.prompt },
  options: {
    ru: [...question.options.ru],
    en: [...question.options.en],
    hi: [...question.options.hi],
  },
  explanation: { ...question.explanation },
});

export default function LilaQuestionsPage() {
  const [questions, setQuestions] = useState<LilaQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<LilaQuestion>(createLilaQuestionDraft());
  const [toast, setToast] = useState<string>('Loading questions...');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedQuestion = useMemo(
    () => questions.find((item) => String(item.id) === selectedId) || questions[0],
    [questions, selectedId],
  );

  useEffect(() => {
    void loadQuestions();
  }, []);

  const loadQuestions = async (preferredId?: string) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/games/lila/questions');
      const nextQuestions = (response.data?.questions || []).map(mapApiQuestionToDraft) as LilaQuestion[];
      setQuestions(nextQuestions);

      if (nextQuestions.length === 0) {
        const emptyDraft = createLilaQuestionDraft();
        setSelectedId(String(emptyDraft.id));
        setDraft(emptyDraft);
        setToast('Question library is empty. Create the first draft.');
        return;
      }

      const nextSelected = nextQuestions.find((item) => String(item.id) === preferredId) || nextQuestions[0];
      setSelectedId(String(nextSelected.id));
      setDraft(cloneQuestion(nextSelected));
      setToast('Question library synced with backend');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load question library';
      setToast(message);
    } finally {
      setLoading(false);
    }
  };

  const persistDraft = async () => {
    setBusy(true);
    try {
      const payload = buildQuestionPayload(draft);
      const isExisting = typeof draft.id === 'number';
      const response = isExisting
        ? await api.put(`/admin/games/lila/questions/${draft.id}`, payload)
        : await api.post('/admin/games/lila/questions', payload);
      const saved = mapApiQuestionToDraft(response.data?.question || {});
      await loadQuestions(String(saved.id));
      setToast(isExisting ? 'Question updated' : 'Question created');
      return saved;
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to save question';
      setToast(message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createNew = () => {
    const next = createLilaQuestionDraft();
    setSelectedId(String(next.id));
    setDraft(cloneQuestion(next));
    setToast('New draft created');
  };

  const duplicateQuestion = () => {
    const source = selectedQuestion || draft;
    const next = {
      ...cloneQuestion(source),
      id: `draft-${Date.now()}`,
      slug: `${source.slug}-copy`,
      status: 'draft' as const,
      updatedAt: new Date().toISOString(),
    };
    setSelectedId(String(next.id));
    setDraft(cloneQuestion(next));
    setToast('Question duplicated');
  };

  const saveDraft = async () => {
    await persistDraft();
  };

  const resetEditor = () => {
    const source = selectedQuestion || questions[0] || createLilaQuestionDraft();
    setDraft(cloneQuestion(source));
    setToast('Editor reset');
  };

  const publishQuestion = async () => {
    setBusy(true);
    try {
      const saved = typeof draft.id === 'number' ? draft : await persistDraft();
      if (!saved || typeof saved.id !== 'number') {
        return;
      }
      await api.post(`/admin/games/lila/questions/${saved.id}/publish`);
      await loadQuestions(String(saved.id));
      setToast('Question published');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to publish question';
      setToast(message);
    } finally {
      setBusy(false);
    }
  };

  const archiveQuestion = async () => {
    if (typeof draft.id !== 'number') {
      const resetDraft = createLilaQuestionDraft();
      setSelectedId(String(resetDraft.id));
      setDraft(resetDraft);
      setToast('Unsaved draft removed');
      return;
    }

    setBusy(true);
    try {
      await api.post(`/admin/games/lila/questions/${draft.id}/archive`);
      await loadQuestions(String(draft.id));
      setToast('Question archived');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to archive question';
      setToast(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Question library</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage editorial drafts for ru/en/hi.</p>
            </div>
            <button onClick={createNew} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500">
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Loading questions...
              </div>
            ) : null}
            {questions.map((question) => (
              <button
                key={String(question.id)}
                onClick={() => {
                  setSelectedId(String(question.id));
                  setDraft(cloneQuestion(question));
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedId === String(question.id) ? 'border-violet-400 bg-violet-50 dark:border-violet-500/50 dark:bg-violet-500/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900 dark:text-white">{question.prompt.en || question.slug}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{question.slug} · {question.type} · {question.status}</div>
                  </div>
                  <div className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    {question.modes.join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Editor actions</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton icon={<CheckCircle2 className="h-4 w-4" />} label="Save" onClick={saveDraft} />
            <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Reset" onClick={resetEditor} />
            <ActionButton icon={<Copy className="h-4 w-4" />} label="Duplicate" onClick={duplicateQuestion} />
            <ActionButton icon={<Rocket className="h-4 w-4" />} label="Publish" onClick={publishQuestion} />
            <ActionButton icon={<Archive className="h-4 w-4" />} label="Archive" onClick={archiveQuestion} />
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            {busy ? 'Saving...' : toast}
          </div>
        </div>
      </aside>

      <div>
        <LilaQuestionEditor
          value={draft}
          onChange={setDraft}
          onSave={saveDraft}
          onReset={resetEditor}
          onDelete={archiveQuestion}
          dangerLabel={typeof draft.id === 'number' ? 'Archive question' : 'Drop draft'}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
      {icon}
      {label}
    </button>
  );
}
