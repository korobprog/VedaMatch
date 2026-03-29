import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    clearNetworkFailure,
    getNetworkRuntimeSnapshot,
    reportNetworkFailure,
    subscribeNetworkRuntime,
    type NetworkFailureKind,
    type NetworkRuntimeSnapshot,
} from './networkStatusRuntime';

type NetworkStatusContextValue = NetworkRuntimeSnapshot & {
    reportNetworkFailure: (kind: NetworkFailureKind) => void;
    clearNetworkFailure: (kind?: NetworkFailureKind) => void;
};

const NetworkStatusContext = createContext<NetworkStatusContextValue | undefined>(undefined);

export const NetworkStatusProvider = ({ children }: { children: ReactNode }) => {
    const [snapshot, setSnapshot] = useState<NetworkRuntimeSnapshot>(() => getNetworkRuntimeSnapshot());

    useEffect(() => subscribeNetworkRuntime(setSnapshot), []);

    const value = useMemo<NetworkStatusContextValue>(() => ({
        ...snapshot,
        reportNetworkFailure,
        clearNetworkFailure,
    }), [snapshot]);

    return (
        <NetworkStatusContext.Provider value={value}>
            {children}
        </NetworkStatusContext.Provider>
    );
};

export const useNetworkStatus = () => {
    const context = useContext(NetworkStatusContext);
    if (!context) {
        throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
    }
    return context;
};
