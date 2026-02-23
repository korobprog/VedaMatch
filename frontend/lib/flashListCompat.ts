import { FlatList } from 'react-native';
import type { ComponentType } from 'react';

type ListComponent = ComponentType<any>;

const supportsFlashList = (): boolean => {
    const runtime = globalThis as unknown as { nativeFabricUIManager?: unknown };
    return Boolean(runtime.nativeFabricUIManager);
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
