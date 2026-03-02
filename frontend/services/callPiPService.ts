import { NativeModules, Platform } from 'react-native';

type NativeCallPiPModule = {
  setCallActive: (active: boolean) => void;
  isSupported: () => Promise<boolean>;
  enterPiP: (width: number, height: number) => Promise<boolean>;
  stopPiP?: () => Promise<boolean>;
};

const nativeModule: NativeCallPiPModule | null =
  (Platform.OS === 'android' || Platform.OS === 'ios')
    ? (NativeModules.CallPiPModule as NativeCallPiPModule | undefined) || null
    : null;

export const callPiPService = {
  async isSupported(): Promise<boolean> {
    if (!nativeModule) {
      return false;
    }
    try {
      return await nativeModule.isSupported();
    } catch {
      return false;
    }
  },

  setCallActive(active: boolean) {
    if (Platform.OS !== 'android') {
      return;
    }
    if (!nativeModule) {
      return;
    }
    try {
      nativeModule.setCallActive(active);
    } catch {
      // no-op
    }
  },

  async enterPiP(width = 9, height = 16): Promise<boolean> {
    if (!nativeModule) {
      return false;
    }
    try {
      return await nativeModule.enterPiP(width, height);
    } catch {
      return false;
    }
  },

  async stopPiP(): Promise<boolean> {
    if (!nativeModule || typeof nativeModule.stopPiP !== 'function') {
      return false;
    }
    try {
      return await nativeModule.stopPiP();
    } catch {
      return false;
    }
  },
};
