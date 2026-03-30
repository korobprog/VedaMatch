jest.mock('react-native-device-info', () => ({
  getBuildNumber: jest.fn(() => '46'),
}));

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'android',
    select: (options: Record<string, unknown>) => options.android ?? options.default,
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldPromptForAndroidRelease } from '../../services/androidReleaseService';

describe('androidReleaseService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('prompts when server versionCode is newer than installed build', async () => {
    await expect(
      shouldPromptForAndroidRelease({
        downloadUrl: 'https://example.com/app.apk',
        appVersion: '1.1.45 (47)',
        versionCode: 47,
        releaseNotes: 'Fix login',
        installInstructions: '',
        minimumSupportedVersionCode: 44,
        publishedAt: '2026-03-30T10:00:00Z',
      }),
    ).resolves.toBe(true);
  });

  it('does not prompt when same version was already dismissed', async () => {
    await AsyncStorage.setItem('android_release_prompt_dismissed_version_code', '47');

    await expect(
      shouldPromptForAndroidRelease({
        downloadUrl: 'https://example.com/app.apk',
        appVersion: '1.1.45 (47)',
        versionCode: 47,
        releaseNotes: 'Fix login',
        installInstructions: '',
        minimumSupportedVersionCode: 44,
        publishedAt: '2026-03-30T10:00:00Z',
      }),
    ).resolves.toBe(false);
  });
});
