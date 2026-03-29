export type NetworkStatusKind = 'healthy' | 'offline' | 'reconnecting' | 'unstable';
export type NetworkFailureKind = 'timeout' | 'network' | 'ws_reconnect' | 'upload_timeout';

export interface NetworkConnectivitySnapshot {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    connectionType: string;
}

export interface NetworkRuntimeSnapshot {
    status: NetworkStatusKind;
    showVpnHint: boolean;
    lastOfflineAt?: number;
    lastFailureAt?: number;
    lastRecoveryAt?: number;
    connectivity: NetworkConnectivitySnapshot;
}

type FailureEntry = {
    kind: NetworkFailureKind;
    at: number;
};

type Listener = (snapshot: NetworkRuntimeSnapshot) => void;

const RECONNECTING_BANNER_MS = 4000;
const FAILURE_WINDOW_MS = 30000;
const UNSTABLE_THRESHOLD = 2;

const listeners = new Set<Listener>();

let connectivity: NetworkConnectivitySnapshot = {
    isConnected: true,
    isInternetReachable: null,
    connectionType: 'unknown',
};
let failures: FailureEntry[] = [];
let reconnectingUntil = 0;
let lastOfflineAt: number | undefined;
let lastFailureAt: number | undefined;
let lastRecoveryAt: number | undefined;
let runtimeTimer: ReturnType<typeof setTimeout> | null = null;

const clearRuntimeTimer = () => {
    if (!runtimeTimer) {
        return;
    }
    clearTimeout(runtimeTimer);
    runtimeTimer = null;
};

const pruneFailures = (now: number) => {
    failures = failures.filter((entry) => now - entry.at <= FAILURE_WINDOW_MS);
};

const isOffline = () => !connectivity.isConnected || connectivity.isInternetReachable === false;

const shouldShowVpnHint = (): boolean => {
    if (isOffline()) {
        return false;
    }

    return failures.length >= UNSTABLE_THRESHOLD
        && failures.some((entry) => ['timeout', 'network', 'ws_reconnect', 'upload_timeout'].includes(entry.kind));
};

const resolveStatus = (now: number): NetworkStatusKind => {
    if (isOffline()) {
        return 'offline';
    }
    if (reconnectingUntil > now) {
        return 'reconnecting';
    }
    if (failures.length >= UNSTABLE_THRESHOLD) {
        return 'unstable';
    }
    return 'healthy';
};

const emitSnapshot = () => {
    const snapshot = getNetworkRuntimeSnapshot();
    for (const listener of listeners) {
        listener(snapshot);
    }
};

const scheduleRuntimeUpdate = () => {
    clearRuntimeTimer();

    const now = Date.now();
    const pendingMoments: number[] = [];

    if (reconnectingUntil > now) {
        pendingMoments.push(reconnectingUntil);
    }

    for (const entry of failures) {
        pendingMoments.push(entry.at + FAILURE_WINDOW_MS);
    }

    const nextMoment = pendingMoments
        .filter((value) => value > now)
        .sort((a, b) => a - b)[0];

    if (!nextMoment) {
        return;
    }

    runtimeTimer = setTimeout(() => {
        pruneFailures(Date.now());
        emitSnapshot();
        scheduleRuntimeUpdate();
    }, Math.max(nextMoment - now, 50));
};

export const getNetworkRuntimeSnapshot = (): NetworkRuntimeSnapshot => {
    const now = Date.now();
    pruneFailures(now);

    return {
        status: resolveStatus(now),
        showVpnHint: shouldShowVpnHint(),
        lastOfflineAt,
        lastFailureAt,
        lastRecoveryAt,
        connectivity,
    };
};

export const subscribeNetworkRuntime = (listener: Listener) => {
    listeners.add(listener);
    listener(getNetworkRuntimeSnapshot());

    return () => {
        listeners.delete(listener);
    };
};

export const updateNetworkConnectivity = (next: Partial<NetworkConnectivitySnapshot>) => {
    const now = Date.now();
    const wasOffline = isOffline();

    connectivity = {
        ...connectivity,
        ...next,
    };

    const isNowOffline = isOffline();
    if (isNowOffline) {
        reconnectingUntil = 0;
        if (!wasOffline) {
            lastOfflineAt = now;
        }
    } else if (wasOffline) {
        reconnectingUntil = now + RECONNECTING_BANNER_MS;
        lastRecoveryAt = now;
    }

    pruneFailures(now);
    emitSnapshot();
    scheduleRuntimeUpdate();
};

export const reportNetworkFailure = (kind: NetworkFailureKind) => {
    const now = Date.now();
    pruneFailures(now);
    failures.push({ kind, at: now });
    lastFailureAt = now;
    emitSnapshot();
    scheduleRuntimeUpdate();
};

export const clearNetworkFailure = (kind?: NetworkFailureKind) => {
    if (kind) {
        failures = failures.filter((entry) => entry.kind !== kind);
    } else {
        failures = [];
    }
    emitSnapshot();
    scheduleRuntimeUpdate();
};
