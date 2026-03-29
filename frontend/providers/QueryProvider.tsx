import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { queryClient } from '../lib/queryClient';
import { migrateFromAsyncStorage } from '../lib/mmkvStorage';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { updateNetworkConnectivity } from '../context/networkStatusRuntime';

function useOnlineManager(enabled: boolean) {
    useEffect(() => {
        if (!enabled) {
            return;
        }
        return NetInfo.addEventListener(state => {
            const status = !!state.isConnected && state.isInternetReachable !== false;
            onlineManager.setOnline(status);
            updateNetworkConnectivity({
                isConnected: !!state.isConnected,
                isInternetReachable: state.isInternetReachable ?? null,
                connectionType: String(state.type || 'unknown'),
            });
        });
    }, [enabled]);
}

function useFocusRefetch(enabled: boolean) {
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const sub = AppState.addEventListener('change', status => {
            if (Platform.OS !== 'web') {
                focusManager.setFocused(status === 'active');
            }
        });
        return () => sub.remove();
    }, [enabled]);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    useOnlineManager(FEATURE_FLAGS.queryLayer);
    useFocusRefetch(FEATURE_FLAGS.queryLayer);

    useEffect(() => {
        void migrateFromAsyncStorage();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
