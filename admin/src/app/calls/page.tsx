'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Star } from 'lucide-react';
import api from '@/lib/api';

type CallDirection = 'incoming' | 'outgoing';

interface CallFeedbackItem {
    id: number;
    callSessionId: string;
    raterUserId: number;
    peerUserId: number;
    direction: CallDirection;
    durationSec: number;
    rating: number;
    reasons: string[];
    comment?: string;
    platform?: string;
    networkType?: string;
    appVersion?: string;
    deviceModel?: string;
    supportTransferAmount?: number;
    createdAt: string;
}

interface ListResponse {
    items: CallFeedbackItem[];
    total: number;
    page: number;
    limit: number;
}

export default function CallsPage() {
    const [items, setItems] = useState<CallFeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [platformFilter, setPlatformFilter] = useState('');
    const [ratingFilter, setRatingFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const selectedItem = useMemo(
        () => items.find((item) => item.id === selectedId) || null,
        [items, selectedId],
    );

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = {};
            if (platformFilter.trim()) params.platform = platformFilter.trim();
            if (ratingFilter.trim()) params.rating = ratingFilter.trim();
            if (dateFrom.trim()) params.dateFrom = new Date(dateFrom).toISOString();
            if (dateTo.trim()) params.dateTo = new Date(dateTo).toISOString();

            const response = await api.get<ListResponse>('/admin/calls/feedback', { params });
            setItems(response.data.items || []);
            setSelectedId((prev) => prev ?? response.data.items?.[0]?.id ?? null);
        } catch (loadErr) {
            console.error(loadErr);
            setError('Не удалось загрузить оценки звонков');
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, platformFilter, ratingFilter]);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Звонки: качество связи</h1>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Оценки после звонков, причины, комментарии и переводы поддержки.
                        </p>
                    </div>
                    <button
                        onClick={() => { void loadItems(); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--secondary)]"
                        type="button"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Обновить
                    </button>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <input
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        type="datetime-local"
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <input
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        type="datetime-local"
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    >
                        <option value="">Рейтинг: все</option>
                        <option value="5">5</option>
                        <option value="4">4</option>
                        <option value="3">3</option>
                        <option value="2">2</option>
                        <option value="1">1</option>
                    </select>
                    <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    >
                        <option value="">Платформа: все</option>
                        <option value="ios">iOS</option>
                        <option value="android">Android</option>
                        <option value="web">Web</option>
                    </select>
                </div>
                <div>
                    <button
                        type="button"
                        onClick={() => { void loadItems(); }}
                        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
                    >
                        Применить фильтры
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--secondary)]/50">
                            <tr>
                                <th className="px-4 py-3 font-medium">Когда</th>
                                <th className="px-4 py-3 font-medium">Пользователи</th>
                                <th className="px-4 py-3 font-medium">Оценка</th>
                                <th className="px-4 py-3 font-medium">Платформа</th>
                                <th className="px-4 py-3 font-medium">Донат</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={`cursor-pointer border-t border-[var(--border)] ${
                                        selectedId === item.id ? 'bg-[var(--secondary)]/60' : 'hover:bg-[var(--secondary)]/30'
                                    }`}
                                >
                                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs text-[var(--muted-foreground)]">
                                            {item.raterUserId} → {item.peerUserId}
                                        </div>
                                        <div className="text-xs text-[var(--muted-foreground)]">{item.direction}, {item.durationSec} сек</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1">
                                            <Star className="h-4 w-4 text-amber-500" />
                                            {item.rating}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{item.platform || '—'}</td>
                                    <td className="px-4 py-3">
                                        {item.supportTransferAmount && item.supportTransferAmount > 0 ? `${item.supportTransferAmount} LKM` : '—'}
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-[var(--muted-foreground)]">
                                        Нет данных
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--muted-foreground)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Загрузка...
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <h2 className="mb-3 text-lg font-semibold">Детали</h2>
                    {!selectedItem ? (
                        <p className="text-sm text-[var(--muted-foreground)]">Выберите запись в таблице.</p>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <div>
                                <div className="text-[var(--muted-foreground)]">Session</div>
                                <div className="break-all">{selectedItem.callSessionId}</div>
                            </div>
                            <div>
                                <div className="text-[var(--muted-foreground)]">Причины</div>
                                <div>{selectedItem.reasons?.length ? selectedItem.reasons.join(', ') : '—'}</div>
                            </div>
                            <div>
                                <div className="text-[var(--muted-foreground)]">Комментарий</div>
                                <div>{selectedItem.comment || '—'}</div>
                            </div>
                            <div>
                                <div className="text-[var(--muted-foreground)]">Диагностика</div>
                                <div>{selectedItem.networkType || '—'} / {selectedItem.appVersion || '—'} / {selectedItem.deviceModel || '—'}</div>
                            </div>
                            <div>
                                <div className="text-[var(--muted-foreground)]">Поддержка</div>
                                <div>{selectedItem.supportTransferAmount && selectedItem.supportTransferAmount > 0 ? `${selectedItem.supportTransferAmount} LKM` : 'не было'}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

