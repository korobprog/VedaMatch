/**
 * Yatra Cache Service
 * Handles offline data caching for tours and shelters using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Yatra, Shelter, YatraListResponse, ShelterListResponse } from '../types/yatra';

// Cache keys
const CACHE_KEYS = {
    YATRAS_LIST: 'v2_cache_yatras_list',
    SHELTERS_LIST: 'v2_cache_shelters_list',
    YATRA_DETAIL: 'v2_cache_yatra_', // + yatraId
    SHELTER_DETAIL: 'v2_cache_shelter_', // + shelterId
    MY_YATRAS: 'v2_cache_my_yatras',
    MY_SHELTERS: 'v2_cache_my_shelters',
    CACHE_TIMESTAMPS: 'v2_cache_timestamps',
};

// Cache expiration time (in milliseconds)
const CACHE_EXPIRY = {
    LIST: 15 * 60 * 1000, // 15 minutes for lists
    DETAIL: 60 * 60 * 1000, // 1 hour for details
    MY_DATA: 5 * 60 * 1000, // 5 minutes for user's own data
};

interface CacheTimestamps {
    [key: string]: number;
}

class YatraCacheService {
    private timestamps: CacheTimestamps = {};
    private ready: Promise<void>;

    constructor() {
        this.ready = this.loadTimestamps();
    }

    private async loadTimestamps(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMPS);
            if (stored) {
                this.timestamps = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[YatraCache] Failed to load timestamps:', error);
        }
    }

    private async saveTimestamp(key: string): Promise<void> {
        this.timestamps[key] = Date.now();
        try {
            await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMPS, JSON.stringify(this.timestamps));
        } catch (error) {
            console.warn('[YatraCache] Failed to save timestamp:', error);
        }
    }

    private async isCacheValid(key: string, expiryMs: number): Promise<boolean> {
        // Wait for timestamps to be loaded
        await this.ready;
        const timestamp = this.timestamps[key];
        if (!timestamp) return false;
        return Date.now() - timestamp < expiryMs;
    }

    // ==================== YATRA CACHE ====================

    async cacheYatrasList(data: YatraListResponse): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.YATRAS_LIST, JSON.stringify(data));
            await this.saveTimestamp(CACHE_KEYS.YATRAS_LIST);
            console.log('[YatraCache] Saved yatras list to cache');
        } catch (error) {
            console.warn('[YatraCache] Failed to cache yatras list:', error);
        }
    }

    async getCachedYatrasList(): Promise<YatraListResponse | null> {
        try {
            if (!await this.isCacheValid(CACHE_KEYS.YATRAS_LIST, CACHE_EXPIRY.LIST)) {
                return null;
            }
            const stored = await AsyncStorage.getItem(CACHE_KEYS.YATRAS_LIST);
            if (stored) {
                console.log('[YatraCache] Loaded yatras list from cache');
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[YatraCache] Failed to get cached yatras list:', error);
        }
        return null;
    }

    async cacheYatraDetail(yatraId: number, yatra: Yatra): Promise<void> {
        try {
            const key = CACHE_KEYS.YATRA_DETAIL + yatraId;
            await AsyncStorage.setItem(key, JSON.stringify(yatra));
            await this.saveTimestamp(key);
            console.log(`[YatraCache] Saved yatra ${yatraId} to cache`);
        } catch (error) {
            console.warn('[YatraCache] Failed to cache yatra detail:', error);
        }
    }

    async getCachedYatraDetail(yatraId: number): Promise<Yatra | null> {
        try {
            const key = CACHE_KEYS.YATRA_DETAIL + yatraId;
            if (!await this.isCacheValid(key, CACHE_EXPIRY.DETAIL)) {
                return null;
            }
            const stored = await AsyncStorage.getItem(key);
            if (stored) {
                console.log(`[YatraCache] Loaded yatra ${yatraId} from cache`);
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[YatraCache] Failed to get cached yatra detail:', error);
        }
        return null;
    }

    async cacheMyYatras(data: any): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.MY_YATRAS, JSON.stringify(data));
            await this.saveTimestamp(CACHE_KEYS.MY_YATRAS);
        } catch (error) {
            console.warn('[YatraCache] Failed to cache my yatras:', error);
        }
    }

    async getCachedMyYatras(): Promise<any | null> {
        try {
            if (!await this.isCacheValid(CACHE_KEYS.MY_YATRAS, CACHE_EXPIRY.MY_DATA)) {
                return null;
            }
            const stored = await AsyncStorage.getItem(CACHE_KEYS.MY_YATRAS);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[YatraCache] Failed to get cached my yatras:', error);
        }
        return null;
    }

    // ==================== SHELTER CACHE ====================

    async cacheSheltersList(data: ShelterListResponse): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.SHELTERS_LIST, JSON.stringify(data));
            await this.saveTimestamp(CACHE_KEYS.SHELTERS_LIST);
            console.log('[YatraCache] Saved shelters list to cache');
        } catch (error) {
            console.warn('[YatraCache] Failed to cache shelters list:', error);
        }
    }

    async getCachedSheltersList(): Promise<ShelterListResponse | null> {
        try {
            if (!await this.isCacheValid(CACHE_KEYS.SHELTERS_LIST, CACHE_EXPIRY.LIST)) {
                return null;
            }
            const stored = await AsyncStorage.getItem(CACHE_KEYS.SHELTERS_LIST);
            if (stored) {
                console.log('[YatraCache] Loaded shelters list from cache');
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[YatraCache] Failed to get cached shelters list:', error);
        }
        return null;
    }

    async cacheShelterDetail(shelterId: number, shelter: Shelter): Promise<void> {
        try {
            const key = CACHE_KEYS.SHELTER_DETAIL + shelterId;
            await AsyncStorage.setItem(key, JSON.stringify(shelter));
            await this.saveTimestamp(key);
            console.log(`[YatraCache] Saved shelter ${shelterId} to cache`);
        } catch (error) {
            console.warn('[YatraCache] Failed to cache shelter detail:', error);
        }
    }

    async getCachedShelterDetail(shelterId: number): Promise<Shelter | null> {
        try {
            const key = CACHE_KEYS.SHELTER_DETAIL + shelterId;
            if (!await this.isCacheValid(key, CACHE_EXPIRY.DETAIL)) {
                return null;
            }
            const stored = await AsyncStorage.getItem(key);
            if (stored) {
                console.log(`[YatraCache] Loaded shelter ${shelterId} from cache`);
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[YatraCache] Failed to get cached shelter detail:', error);
        }
        return null;
    }

    async cacheMyShelters(data: Shelter[]): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.MY_SHELTERS, JSON.stringify(data));
            await this.saveTimestamp(CACHE_KEYS.MY_SHELTERS);
        } catch (error) {
            console.warn('[YatraCache] Failed to cache my shelters:', error);
        }
    }

    async getCachedMyShelters(): Promise<Shelter[] | null> {
        try {
            if (!await this.isCacheValid(CACHE_KEYS.MY_SHELTERS, CACHE_EXPIRY.MY_DATA)) {
                return null;
            }
            const stored = await AsyncStorage.getItem(CACHE_KEYS.MY_SHELTERS);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[YatraCache] Failed to get cached my shelters:', error);
        }
        return null;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Clear all yatra-related cache
     */
    async clearAllCache(): Promise<void> {
        try {
            const keysToRemove = await AsyncStorage.getAllKeys();
            const cacheKeys = keysToRemove.filter(key =>
                key.startsWith('cache_yatra') ||
                key.startsWith('cache_shelter') ||
                key === CACHE_KEYS.CACHE_TIMESTAMPS
            );
            await AsyncStorage.multiRemove(cacheKeys);
            this.timestamps = {};
            console.log('[YatraCache] Cleared all cache');
        } catch (error) {
            console.warn('[YatraCache] Failed to clear cache:', error);
        }
    }

    /**
     * Clear cache for a specific yatra
     */
    async invalidateYatra(yatraId: number): Promise<void> {
        try {
            const key = CACHE_KEYS.YATRA_DETAIL + yatraId;
            await AsyncStorage.removeItem(key);
            delete this.timestamps[key];
            // Also invalidate lists as they contain this yatra
            await AsyncStorage.removeItem(CACHE_KEYS.YATRAS_LIST);
            delete this.timestamps[CACHE_KEYS.YATRAS_LIST];
            console.log(`[YatraCache] Invalidated cache for yatra ${yatraId}`);
        } catch (error) {
            console.warn('[YatraCache] Failed to invalidate yatra cache:', error);
        }
    }

    /**
     * Clear cache for a specific shelter
     */
    async invalidateShelter(shelterId: number): Promise<void> {
        try {
            const key = CACHE_KEYS.SHELTER_DETAIL + shelterId;
            await AsyncStorage.removeItem(key);
            delete this.timestamps[key];
            await AsyncStorage.removeItem(CACHE_KEYS.SHELTERS_LIST);
            delete this.timestamps[CACHE_KEYS.SHELTERS_LIST];
            console.log(`[YatraCache] Invalidated cache for shelter ${shelterId}`);
        } catch (error) {
            console.warn('[YatraCache] Failed to invalidate shelter cache:', error);
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<{
        cachedYatras: number;
        cachedShelters: number;
        totalSize: string;
    }> {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const yatraKeys = allKeys.filter(k => k.startsWith(CACHE_KEYS.YATRA_DETAIL));
            const shelterKeys = allKeys.filter(k => k.startsWith(CACHE_KEYS.SHELTER_DETAIL));

            // Estimate size
            let totalBytes = 0;
            const cacheKeys = allKeys.filter(k => k.startsWith('cache_'));
            for (const key of cacheKeys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    totalBytes += value.length * 2; // UTF-16 encoding
                }
            }

            return {
                cachedYatras: yatraKeys.length,
                cachedShelters: shelterKeys.length,
                totalSize: totalBytes > 1024 * 1024
                    ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
                    : `${(totalBytes / 1024).toFixed(2)} KB`,
            };
        } catch (error) {
            console.warn('[YatraCache] Failed to get cache stats:', error);
            return { cachedYatras: 0, cachedShelters: 0, totalSize: '0 KB' };
        }
    }
}

export const yatraCacheService = new YatraCacheService();
