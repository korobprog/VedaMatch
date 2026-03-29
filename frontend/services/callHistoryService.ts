import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export type CallHistoryType = 'incoming' | 'outgoing' | 'missed';

export interface CallHistoryEntry {
    id: string;
    userId?: number;
    name: string;
    type: CallHistoryType;
    timestamp: string;
    durationSec: number;
}

interface NewCallHistoryEntry {
    userId?: number;
    name: string;
    type: CallHistoryType;
    timestamp?: string;
    durationSec?: number;
}

const CALL_HISTORY_STORAGE_KEY = 'call_history_v1';
const CALL_HISTORY_MAX_ITEMS = 100;

const normalizeEntry = (entry: Partial<CallHistoryEntry>): CallHistoryEntry | null => {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    if (typeof entry.id !== 'string' || !entry.id.trim()) {
        return null;
    }

    if (typeof entry.name !== 'string' || !entry.name.trim()) {
        return null;
    }

    if (entry.type !== 'incoming' && entry.type !== 'outgoing' && entry.type !== 'missed') {
        return null;
    }

    if (typeof entry.timestamp !== 'string' || Number.isNaN(new Date(entry.timestamp).getTime())) {
        return null;
    }

    const normalizedUserId = typeof entry.userId === 'number' && Number.isFinite(entry.userId)
        ? entry.userId
        : undefined;

    const normalizedDuration = typeof entry.durationSec === 'number' && Number.isFinite(entry.durationSec)
        ? Math.max(0, Math.round(entry.durationSec))
        : 0;

    return {
        id: entry.id,
        userId: normalizedUserId,
        name: entry.name.trim(),
        type: entry.type,
        timestamp: entry.timestamp,
        durationSec: normalizedDuration,
    };
};

const safeParseHistory = (raw: string | null): CallHistoryEntry[] => {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => normalizeEntry(item))
            .filter((item): item is CallHistoryEntry => Boolean(item))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
        return [];
    }
};

const generateEntryId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const callHistoryService = {
    async getHistory(): Promise<CallHistoryEntry[]> {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
            const storagePromise = AsyncStorage.getItem(CALL_HISTORY_STORAGE_KEY);
            const timeoutPromise = new Promise<null>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('AsyncStorage timeout')), 3000);
            });

            const raw = await Promise.race([storagePromise, timeoutPromise]);
            return safeParseHistory(raw);
        } catch (error: any) {
            if (error.message === 'AsyncStorage timeout') {
                console.warn('[callHistoryService] getHistory timeout');
            }
            return [];
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    },

    async addEntry(entry: NewCallHistoryEntry): Promise<CallHistoryEntry[]> {
        const history = await this.getHistory();

        const timestamp = entry.timestamp && !Number.isNaN(new Date(entry.timestamp).getTime())
            ? entry.timestamp
            : new Date().toISOString();

        const nextEntry: CallHistoryEntry = {
            id: generateEntryId(),
            userId: typeof entry.userId === 'number' && Number.isFinite(entry.userId) ? entry.userId : undefined,
            name: entry.name.trim() || 'Unknown',
            type: entry.type,
            timestamp,
            durationSec: typeof entry.durationSec === 'number' && Number.isFinite(entry.durationSec)
                ? Math.max(0, Math.round(entry.durationSec))
                : 0,
        };

        const updated = [nextEntry, ...history].slice(0, CALL_HISTORY_MAX_ITEMS);

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
            const storagePromise = AsyncStorage.setItem(CALL_HISTORY_STORAGE_KEY, JSON.stringify(updated));
            const timeoutPromise = new Promise<void>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('AsyncStorage timeout')), 3000);
            });

            await Promise.race([storagePromise, timeoutPromise]);
        } catch (error: any) {
            if (error.message === 'AsyncStorage timeout') {
                console.warn('[callHistoryService] addEntry timeout');
            }
            throw error;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }

        return updated;
    },
};

export const formatCallHistoryTime = (timestamp: string, locale = 'ru-RU'): string => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);

    const callDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const language = i18n.language?.toLowerCase().startsWith('hi')
        ? 'hi'
        : locale.toLowerCase().startsWith('ru')
          ? 'ru'
          : 'en';
    const todayLabel = language === 'ru' ? 'Сегодня' : language === 'hi' ? 'आज' : 'Today';
    const yesterdayLabel = language === 'ru' ? 'Вчера' : language === 'hi' ? 'कल' : 'Yesterday';

    if (callDay.getTime() === startToday.getTime()) {
        return `${todayLabel}, ${time}`;
    }

    if (callDay.getTime() === startYesterday.getTime()) {
        return `${yesterdayLabel}, ${time}`;
    }

    const datePart = date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
    return `${datePart}, ${time}`;
};
