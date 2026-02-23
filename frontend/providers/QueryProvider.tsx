import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { queryClient } from '../lib/queryClient';
import { migrateFromAsyncStorage } from '../lib/mmkvStorage';

function useOnlineManager() {
    useEffect(() => {
        return NetInfo.addEventListener(state => {
            const status = !!state.isConnected;
            onlineManager.setOnline(status);
        });
    }, []);
}

function useFocusRefetch() {
    useEffect(() => {
        const sub = AppState.addEventListener('change', status => {
            if (Platform.OS !== 'web') {
                focusManager.setFocused(status === 'active');
            }
        });
        return () => sub.remove();
    }, []);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    useOnlineManager();
    useFocusRefetch();

    useEffect(() => {
        void migrateFromAsyncStorage();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
