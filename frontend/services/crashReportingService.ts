import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { APP_ENV } from '../config/api.config';

type CrashlyticsInstance = {
    setAttributes?: (attributes: Record<string, string>) => void;
    setUserId?: (userId: string) => void;
    log?: (message: string) => void;
    recordError?: (error: Error) => void;
};

let crashlyticsInstance: CrashlyticsInstance | null = null;
let crashlyticsResolved = false;

const getCrashlytics = (): CrashlyticsInstance | null => {
    if (crashlyticsResolved) {
        return crashlyticsInstance;
    }

    try {
        // Optional dependency: safe to keep disabled in environments without Crashlytics.
        const moduleRef = require('@react-native-firebase/crashlytics');
        const instanceFactory = moduleRef?.default;
        crashlyticsInstance = typeof instanceFactory === 'function' ? instanceFactory() : null;
    } catch {
        crashlyticsInstance = null;
    }
    crashlyticsResolved = true;

    return crashlyticsInstance;
};

const normalizeError = (error: unknown): Error => {
    if (error instanceof Error) {
        return error;
    }
    return new Error(typeof error === 'string' ? error : JSON.stringify(error));
};

const toStringMap = (values: Record<string, unknown>): Record<string, string> => {
    const result: Record<string, string> = {};
    Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        result[key] = String(value);
    });
    return result;
};

export const crashReportingService = {
    configureReleaseTags(extraTags: Record<string, unknown> = {}) {
        const crashlytics = getCrashlytics();
        if (!crashlytics?.setAttributes) return;

        crashlytics.setAttributes(
            toStringMap({
                app_env: APP_ENV || 'unknown',
                app_version: DeviceInfo.getVersion(),
                app_build: DeviceInfo.getBuildNumber(),
                platform: Platform.OS,
                ...extraTags,
            }),
        );
    },

    setUserContext(userId?: number | null) {
        const crashlytics = getCrashlytics();
        if (!crashlytics?.setUserId) return;
        crashlytics.setUserId(userId ? String(userId) : 'anonymous');
    },

    logBreadcrumb(message: string) {
        const crashlytics = getCrashlytics();
        if (crashlytics?.log) {
            crashlytics.log(message);
        }
    },

    recordError(error: unknown, context?: string) {
        const normalized = normalizeError(error);
        const crashlytics = getCrashlytics();

        if (context && crashlytics?.log) {
            crashlytics.log(context);
        }

        if (crashlytics?.recordError) {
            crashlytics.recordError(normalized);
            return;
        }

        console.error('[CrashReporting]', context || '', normalized);
    },
};
