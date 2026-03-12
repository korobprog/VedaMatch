'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2, MessageSquarePlus, Paperclip, Send } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
]);

interface AndroidTestersConfig {
    title: string;
    subtitle: string;
    apkUrl: string;
    appVersion: string;
    releaseNotes: string;
    installInstructions: string;
    supportText: string;
    feedbackEntryPoint: string;
    attachment?: {
        maxBytes?: number;
        maxMegabytes?: number;
        types?: string[];
    };
}

interface FeedbackFormState {
    name: string;
    contact: string;
    subject: string;
    message: string;
}

const DEFAULT_CONFIG: AndroidTestersConfig = {
    title: 'Android test builds',
    subtitle: 'Скачайте APK и отправьте отзыв, если нашли баг или странное поведение.',
    apkUrl: '',
    appVersion: '',
    releaseNotes: '',
    installInstructions: '1. Скачайте APK на Android.\n2. Разрешите установку из этого источника.\n3. Откройте файл и подтвердите установку.',
    supportText: 'Можно приложить один скриншот проблемы.',
    feedbackEntryPoint: 'android_tester_feedback',
    attachment: {
        maxBytes: MAX_ATTACHMENT_BYTES,
        maxMegabytes: 10,
        types: Array.from(ALLOWED_MIME_TYPES),
    },
};

const DEFAULT_FORM: FeedbackFormState = {
    name: '',
    contact: '',
    subject: '',
    message: '',
};

const splitMultilineContent = (value: string): string[] =>
    value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

const isValidGuestContact = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }
    if (trimmed.startsWith('@')) {
        return trimmed.length >= 2;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const maybeError = error as { response?: { data?: { error?: string } } };
        const serverMessage = maybeError.response?.data?.error;
        if (typeof serverMessage === 'string' && serverMessage.trim()) {
            return serverMessage;
        }
    }
    return fallback;
};

export default function AndroidTestersPageClient() {
    const { showToast } = useToast();
    const [config, setConfig] = useState<AndroidTestersConfig>(DEFAULT_CONFIG);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [configError, setConfigError] = useState('');
    const [form, setForm] = useState<FeedbackFormState>(DEFAULT_FORM);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentError, setAttachmentError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            setLoadingConfig(true);
            setConfigError('');
            try {
                const response = await api.get('/android-testers/config');
                setConfig({ ...DEFAULT_CONFIG, ...(response.data as Partial<AndroidTestersConfig>) });
            } catch (error) {
                console.error('Failed to load android testers config', error);
                setConfigError('Не удалось загрузить данные для тестировщиков. Попробуйте позже.');
            } finally {
                setLoadingConfig(false);
            }
        };

        loadConfig();
    }, []);

    const releaseNotes = useMemo(() => splitMultilineContent(config.releaseNotes), [config.releaseNotes]);
    const installSteps = useMemo(() => splitMultilineContent(config.installInstructions), [config.installInstructions]);

    const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setAttachmentError('');
        setAttachment(file);

        if (!file) {
            return;
        }

        const maxBytes = config.attachment?.maxBytes || MAX_ATTACHMENT_BYTES;
        if (file.size > maxBytes) {
            setAttachment(null);
            setAttachmentError(`Файл слишком большой. Максимум ${Math.round(maxBytes / (1024 * 1024))} MB.`);
            return;
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            setAttachment(null);
            setAttachmentError('Можно прикрепить только изображение: JPG, PNG, WEBP, GIF, HEIC или HEIF.');
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitted(false);
        setAttachmentError('');

        if (!isValidGuestContact(form.contact)) {
            showToast('Укажите email или @telegram для обратной связи.', 'error');
            return;
        }
        if (!form.message.trim() && !attachment) {
            showToast('Добавьте описание проблемы или приложите скриншот.', 'error');
            return;
        }

        setSubmitting(true);
        let attachmentUrl = '';
        let attachmentMimeType = '';

        try {
            if (attachment) {
                setUploading(true);
                const uploadData = new FormData();
                uploadData.append('file', attachment);
                const uploadResponse = await api.post('/support/uploads', uploadData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                attachmentUrl = String(uploadResponse.data?.url || '');
                attachmentMimeType = String(uploadResponse.data?.contentType || attachment.type || '');
                setUploading(false);
            }

            await api.post('/support/tickets', {
                name: form.name.trim(),
                contact: form.contact.trim(),
                subject: form.subject.trim() ? `[Android Test] ${form.subject.trim()}` : '[Android Test] Feedback',
                message: form.message.trim(),
                entryPoint: config.feedbackEntryPoint || 'android_tester_feedback',
                attachmentUrl,
                attachmentMimeType,
                devicePlatform: 'android_web',
                deviceOS: 'android',
                appVersion: config.appVersion.trim(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            });

            setForm(DEFAULT_FORM);
            setAttachment(null);
            setSubmitted(true);
            showToast('Отзыв отправлен. Спасибо.', 'success');
        } catch (error) {
            console.error('Failed to submit android tester feedback', error);
            showToast(getErrorMessage(error, 'Не удалось отправить отзыв. Попробуйте позже.'), 'error');
        } finally {
            setUploading(false);
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#164e6322,transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <section className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-3">
                            <span className="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                                Android testers
                            </span>
                            <div>
                                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{config.title}</h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                                    {config.subtitle}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                            <div className="text-xs uppercase tracking-[0.24em] text-emerald-200/70">Current build</div>
                            <div className="mt-1 text-lg font-semibold">{config.appVersion || 'version not set'}</div>
                        </div>
                    </div>
                </section>

                {loadingConfig ? (
                    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-slate-200">
                        <div className="flex items-center gap-3 text-sm">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Загружаем информацию о тестовой сборке...
                        </div>
                    </section>
                ) : configError ? (
                    <section className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-8 text-rose-100">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>{configError}</div>
                        </div>
                    </section>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                        <section className="space-y-6">
                            <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-xl shadow-slate-950/20">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold">Скачать APK</h2>
                                        <p className="mt-2 text-sm text-slate-300">
                                            Используйте эту ссылку для установки или обновления Android-сборки тестовой группы.
                                        </p>
                                    </div>
                                    <Download className="h-6 w-6 text-cyan-300" />
                                </div>

                                {config.apkUrl ? (
                                    <div className="mt-5 space-y-3">
                                        <a
                                            href={config.apkUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                                        >
                                            <Download className="h-4 w-4" />
                                            Скачать APK
                                        </a>
                                        <p className="break-all text-xs text-slate-400">{config.apkUrl}</p>
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                                        Актуальная ссылка на APK еще не задана в admin settings.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-xl shadow-slate-950/20">
                                <h2 className="text-xl font-semibold">Как установить</h2>
                                <ol className="mt-4 space-y-3">
                                    {installSteps.map((step, index) => (
                                        <li key={`${step}-${index}`} className="flex gap-3 text-sm text-slate-200">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs font-semibold text-cyan-200">
                                                {index + 1}
                                            </span>
                                            <span className="pt-0.5">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {releaseNotes.length > 0 && (
                                <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-xl shadow-slate-950/20">
                                    <h2 className="text-xl font-semibold">Что нового</h2>
                                    <ul className="mt-4 space-y-3 text-sm text-slate-200">
                                        {releaseNotes.map((item, index) => (
                                            <li key={`${item}-${index}`} className="flex gap-3">
                                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>

                        <section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-xl shadow-slate-950/20">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold">Отправить отзыв</h2>
                                    <p className="mt-2 text-sm text-slate-300">
                                        {config.supportText || 'Опишите проблему, шаги воспроизведения и приложите один скриншот, если это поможет быстрее разобраться.'}
                                    </p>
                                </div>
                                <MessageSquarePlus className="h-6 w-6 text-cyan-300" />
                            </div>

                            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Имя или ник</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                        placeholder="Например, @tester_roma"
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Контакт</label>
                                    <input
                                        type="text"
                                        value={form.contact}
                                        onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                                        placeholder="email@example.com или @telegram"
                                        required
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Тема</label>
                                    <input
                                        type="text"
                                        value={form.subject}
                                        onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                                        placeholder="Например, не открывается Telegram login"
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Сообщение</label>
                                    <textarea
                                        value={form.message}
                                        onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                                        placeholder="Что произошло, как повторить, какой результат ожидали."
                                        rows={6}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Скриншот</label>
                                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/7">
                                        <Paperclip className="h-4 w-4 text-cyan-300" />
                                        <span className="flex-1 truncate">{attachment?.name || 'Прикрепить изображение'}</span>
                                        <span className="text-xs text-slate-400">до {config.attachment?.maxMegabytes || 10} MB</span>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                                            className="hidden"
                                            onChange={handleAttachmentChange}
                                        />
                                    </label>
                                    {attachmentError && <p className="text-sm text-rose-300">{attachmentError}</p>}
                                </div>

                                {submitted && (
                                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                            <span>Спасибо, отзыв отправлен. Если понадобится, мы свяжемся по указанному контакту.</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/50"
                                >
                                    {submitting || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    {uploading ? 'Загружаем скриншот...' : submitting ? 'Отправляем отзыв...' : 'Отправить отзыв'}
                                </button>
                            </form>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
