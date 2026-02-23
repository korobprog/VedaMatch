/**
 * MMKV-based fast storage for critical key-value data.
 *
 * Used for: auth tokens, session, user profile, settings flags.
 * AsyncStorage is kept for large offline payloads (cache lists, etc.).
 *
 * On first run after migration, existing AsyncStorage values are
 * pulled into MMKV automatically via `migrateFromAsyncStorage`.
 */
import { createMMKV } from 'react-native-mmkv';

export const mmkv = createMMKV({ id: 'vedamatch-main' });

// ─── Typed helpers ───────────────────────────────────────────────

export function mmkvGetString(key: string): string | undefined {
    return mmkv.getString(key);
}

export function mmkvSetString(key: string, value: string): void {
    mmkv.set(key, value);
}

export function mmkvGetBool(key: string): boolean | undefined {
    return mmkv.getBoolean(key);
}

export function mmkvSetBool(key: string, value: boolean): void {
    mmkv.set(key, value);
}

export function mmkvDelete(key: string): void {
    mmkv.remove(key);
}

export function mmkvDeleteMultiple(keys: string[]): void {
    for (const key of keys) {
        mmkv.remove(key);
    }
}

export function mmkvContains(key: string): boolean {
    return mmkv.contains(key);
}

// ─── Migration helper ────────────────────────────────────────────

const MIGRATION_DONE_KEY = '__mmkv_migration_done__';

/**
 * One-time migration of auth-critical keys from AsyncStorage → MMKV.
 * Call once at app startup, before any token reads.
 * Safe to call repeatedly — no-ops after first migration.
 */
export async function migrateFromAsyncStorage(): Promise<void> {
    if (mmkv.getBoolean(MIGRATION_DONE_KEY)) {
        return;
    }

    try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

        const keysToMigrate = [
            'token',
            'refreshToken',
            'accessTokenExpiresAt',
            'refreshTokenExpiresAt',
            'sessionId',
            'user',
            'pushToken',
            'active_math_id',
        ];

        const pairs = await AsyncStorage.multiGet(keysToMigrate);
        for (const [key, value] of pairs) {
            if (value != null && value !== '' && value !== 'undefined' && value !== 'null') {
                mmkv.set(key, value);
            }
        }

        mmkv.set(MIGRATION_DONE_KEY, true);
    } catch (error) {
        // Migration failure is non-fatal — AsyncStorage fallback still works
        console.warn('[MMKV] Migration from AsyncStorage failed:', error);
    }
}
