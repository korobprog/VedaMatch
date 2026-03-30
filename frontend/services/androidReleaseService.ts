import axios from 'axios';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { API_PATH } from '../config/api.config';

const DISMISSED_VERSION_CODE_KEY = 'android_release_prompt_dismissed_version_code';
const publicApiClient = axios.create({
    baseURL: API_PATH,
    timeout: 10000,
});

export type AndroidReleaseConfig = {
    downloadUrl: string;
    appVersion: string;
    versionCode: number;
    releaseNotes: string;
    installInstructions: string;
    minimumSupportedVersionCode: number;
    publishedAt: string;
};

type PublicMobileAppConfigResponse = {
    androidRelease?: Partial<AndroidReleaseConfig>;
};

const toPositiveInt = (value: unknown): number => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeReleaseConfig = (payload?: Partial<AndroidReleaseConfig> | null): AndroidReleaseConfig | null => {
    if (!payload) {
        return null;
    }

    const downloadUrl = String(payload.downloadUrl || '').trim();
    const versionCode = toPositiveInt(payload.versionCode);
    if (!downloadUrl || versionCode <= 0) {
        return null;
    }

    return {
        downloadUrl,
        appVersion: String(payload.appVersion || '').trim(),
        versionCode,
        releaseNotes: String(payload.releaseNotes || '').trim(),
        installInstructions: String(payload.installInstructions || '').trim(),
        minimumSupportedVersionCode: toPositiveInt(payload.minimumSupportedVersionCode),
        publishedAt: String(payload.publishedAt || '').trim(),
    };
};

export const shouldPromptForAndroidRelease = async (release: AndroidReleaseConfig | null): Promise<boolean> => {
    if (Platform.OS !== 'android' || !release) {
        return false;
    }

    const currentBuildNumber = toPositiveInt(DeviceInfo.getBuildNumber());
    if (currentBuildNumber <= 0 || release.versionCode <= currentBuildNumber) {
        return false;
    }

    const dismissedVersionCode = toPositiveInt(await AsyncStorage.getItem(DISMISSED_VERSION_CODE_KEY));
    return dismissedVersionCode < release.versionCode;
};

export const androidReleaseService = {
    async fetchLatestRelease(): Promise<AndroidReleaseConfig | null> {
        const { data } = await publicApiClient.get<PublicMobileAppConfigResponse>('/mobile-app/config');
        return normalizeReleaseConfig(data?.androidRelease);
    },

    async checkForUpdate(): Promise<AndroidReleaseConfig | null> {
        const release = await this.fetchLatestRelease();
        if (!(await shouldPromptForAndroidRelease(release))) {
            return null;
        }
        return release;
    },

    async dismissPrompt(versionCode: number): Promise<void> {
        await AsyncStorage.setItem(DISMISSED_VERSION_CODE_KEY, String(versionCode));
    },

    async trackEvent(event: 'page_view' | 'download_click' | 'prompt_shown' | 'prompt_open', entrySource: 'site' | 'telegram' | 'in_app') {
        try {
            await publicApiClient.post('/mobile-app/android-release/events', { event, entrySource });
        } catch (error) {
            console.warn('[AndroidRelease] Failed to track event', error);
        }
    },

    async openDownloadUrl(release: AndroidReleaseConfig): Promise<void> {
        await Linking.openURL(release.downloadUrl);
    },
};
