import { FlatList, NativeModules } from 'react-native';
import type { ComponentType } from 'react';

type ListComponent = ComponentType<any>;

const isNativeNewArchitectureEnabled = (): boolean => {
    const platformConstants = (NativeModules as { PlatformConstants?: { isNewArchEnabled?: boolean } }).PlatformConstants;
    if (typeof platformConstants?.isNewArchEnabled === 'boolean') {
        return platformConstants.isNewArchEnabled;
    }

    const runtime = globalThis as unknown as {
        nativeFabricUIManager?: unknown;
        __turboModuleProxy?: unknown;
    };
    // FlashList v2 is stable only when both Fabric and TurboModules are enabled.
    return Boolean(runtime.nativeFabricUIManager) && Boolean(runtime.__turboModuleProxy);
};

const supportsFlashList = (): boolean => {
    return isNativeNewArchitectureEnabled();
};

let ResolvedFlashList: ListComponent = FlatList as unknown as ListComponent;
let flashListAvailable = false;

if (supportsFlashList()) {
    try {
        const module = require('@shopify/flash-list') as { FlashList?: ListComponent };
        if (module?.FlashList) {
            ResolvedFlashList = module.FlashList;
            flashListAvailable = true;
        }
    } catch (error) {
        if (__DEV__) {
            console.warn('[FlashListCompat] FlashList disabled, fallback to FlatList.', error);
        }
    }
}

export const FlashList = ResolvedFlashList;
export const isFlashListAvailable = flashListAvailable;

export const shouldUseFlashList = (enabledByFlag = true): boolean => {
    return enabledByFlag && isFlashListAvailable;
};
