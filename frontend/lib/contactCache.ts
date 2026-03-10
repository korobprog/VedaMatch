import { InfiniteData, QueryClient } from '@tanstack/react-query';

import { mmkvDeleteMultiple, mmkvGetString, mmkvSetString } from './mmkvStorage';
import { PaginatedContactsResponse } from '../services/contactService';

export const CONTACTS_CACHE_STALE_TIME_MS = 5 * 60_000;
export const CONTACTS_CACHE_GC_TIME_MS = 60 * 60_000;
export const CONTACTS_SNAPSHOT_TTL_MS = 24 * 60 * 60_000;
export const CONTACTS_CITIES_CACHE_TIME_MS = 24 * 60 * 60_000;
export const CONTACTS_AVATAR_PRELOAD_LIMIT = 12;

type ContactsSnapshotVariant = 'all' | 'friends' | 'blocked';
type ContactsPageParam = number | undefined;
type ContactsInfiniteData = InfiniteData<PaginatedContactsResponse, unknown>;

export type ContactsCacheSnapshot = {
    updatedAt: number;
    pages: PaginatedContactsResponse[];
    pageParams: ContactsPageParam[];
};

const CONTACTS_SNAPSHOT_KEYS: Record<ContactsSnapshotVariant, string> = {
    all: 'contacts_snapshot_all_v1',
    friends: 'contacts_snapshot_friends_v1',
    blocked: 'contacts_snapshot_blocked_v1',
};

export const CONTACTS_BASE_QUERY_KEYS = {
    all: ['contacts', 'all', '', ''] as const,
    friends: ['contacts', 'friends', ''] as const,
    blocked: ['contacts', 'blocked', ''] as const,
};

const isSnapshotFresh = (updatedAt: number) => Date.now() - updatedAt <= CONTACTS_SNAPSHOT_TTL_MS;

export const readContactsSnapshot = (variant: ContactsSnapshotVariant): ContactsCacheSnapshot | null => {
    const raw = mmkvGetString(CONTACTS_SNAPSHOT_KEYS[variant]);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as ContactsCacheSnapshot;
        if (
            !parsed ||
            typeof parsed.updatedAt !== 'number' ||
            !Array.isArray(parsed.pages) ||
            !Array.isArray(parsed.pageParams)
        ) {
            return null;
        }

        if (!isSnapshotFresh(parsed.updatedAt)) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
};

export const buildContactsSnapshotInitialData = (
    snapshot: ContactsCacheSnapshot | null,
): ContactsInfiniteData | undefined => {
    if (!snapshot) {
        return undefined;
    }

    return {
        pages: snapshot.pages,
        pageParams: snapshot.pageParams,
    };
};

export const writeContactsSnapshot = (
    variant: ContactsSnapshotVariant,
    data?: ContactsInfiniteData,
): void => {
    const firstPage = data?.pages?.[0];
    if (!firstPage) {
        return;
    }

    const snapshot: ContactsCacheSnapshot = {
        updatedAt: Date.now(),
        pages: [firstPage],
        pageParams: [typeof data?.pageParams?.[0] === 'number' ? data.pageParams[0] : undefined],
    };

    mmkvSetString(CONTACTS_SNAPSHOT_KEYS[variant], JSON.stringify(snapshot));
};

export const clearContactsSnapshots = (): void => {
    mmkvDeleteMultiple(Object.values(CONTACTS_SNAPSHOT_KEYS));
};

export const invalidateContactsCaches = async (queryClient: QueryClient): Promise<void> => {
    clearContactsSnapshots();
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: ['contacts-meta'], refetchType: 'none' }),
    ]);
};

export const clearContactsCaches = (queryClient: QueryClient): void => {
    clearContactsSnapshots();
    queryClient.removeQueries({ queryKey: ['contacts'] });
    queryClient.removeQueries({ queryKey: ['contacts-meta'] });
};
