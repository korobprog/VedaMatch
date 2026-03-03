import { NativeModules, Platform } from 'react-native';

type NativeCallPiPModule = {
  setCallActive: (active: boolean) => void;
  isSupported: () => Promise<boolean>;
  enterPiP: (width: number, height: number) => Promise<boolean>;
  stopPiP?: () => Promise<boolean>;
};

const androidNativeModule: NativeCallPiPModule | null =
  Platform.OS === 'android'
    ? (NativeModules.CallPiPModule as NativeCallPiPModule | undefined) || null
    : null;

export const callPiPService = {
  async isSupported(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true;
    }
    if (!androidNativeModule) {
      return false;
    }
    try {
      return await androidNativeModule.isSupported();
    } catch {
      return false;
    }
  },

  setCallActive(active: boolean) {
    if (Platform.OS !== 'android') {
      return;
    }
    if (!androidNativeModule) {
      return;
    }
    try {
      androidNativeModule.setCallActive(active);
    } catch {
      // no-op
    }
  },

  async enterPiP(width = 9, height = 16): Promise<boolean> {
    if (Platform.OS !== 'android' || !androidNativeModule) {
      return false;
    }
    try {
      return await androidNativeModule.enterPiP(width, height);
    } catch {
      return false;
    }
  },

  async stopPiP(): Promise<boolean> {
    if (Platform.OS !== 'android' || !androidNativeModule || typeof androidNativeModule.stopPiP !== 'function') {
      return false;
    }
    try {
      return await androidNativeModule.stopPiP();
    } catch {
      return false;
    }
  },
};
