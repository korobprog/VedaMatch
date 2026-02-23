import Config from 'react-native-config';

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === 'undefined' || normalized === 'null') {
        return fallback;
    }

    if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
        return false;
    }

    return fallback;
};

const readEnv = (key: string): string | undefined => {
    try {
        return (Config as any)?.[key];
    } catch {
        return undefined;
    }
};

export const FEATURE_FLAGS = {
    queryLayer: normalizeBoolean(readEnv('FF_QUERY_LAYER'), true),
    flashlistNews: normalizeBoolean(readEnv('FF_FLASHLIST_NEWS'), true),
    flashlistServices: normalizeBoolean(readEnv('FF_FLASHLIST_SERVICES'), true),
};

