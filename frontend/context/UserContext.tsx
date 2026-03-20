import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { contactService } from '../services/contactService';
import { MathFilter, PortalBlueprint } from '../types/portalBlueprint';
import { clearAuthTokens, getAccessToken, logoutAuthSession, refreshAuthTokens, saveAuthTokens } from '../services/authSessionService';
import { accountService } from '../services/accountService';
import { mmkvDeleteMultiple, mmkvGetString, mmkvSetString } from '../lib/mmkvStorage';
import { clearContactsCaches } from '../lib/contactCache';
import { queryClient } from '../lib/queryClient';
import apiClient from '../lib/apiClient';

interface UserProfile {
    karmicName: string;
    spiritualName?: string;
    nickname?: string;
    nicknameDisplay?: string;
    avatar?: string;
    email?: string;
    isProfileComplete?: boolean;
    isTourCompleted?: boolean;
    ID?: number;
    city?: string;
    madh?: string;
    yogaStyle?: string;
    guna?: string;
    identity?: string;
    datingEnabled?: boolean;
    language?: string;
    latitude?: number;
    longitude?: number;
    role?: string;
    godModeEnabled?: boolean;
    currentPlan?: string;
    googleSub?: string;
    googleEmail?: string;
    googleLinkedAt?: string;
    vkUserId?: number;
    vkEmail?: string;
    vkLinkedAt?: string;
    telegramUserId?: number;
    telegramUsername?: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramLinkedAt?: string;
    // Additional profile fields
    country?: string;
    mentor?: string;
    gender?: string;
    diet?: string;
    bio?: string;
    interests?: string;
    lookingFor?: string;
    skills?: string;
    industry?: string;
    lookingForBusiness?: string;
    intentions?: string;
    maritalStatus?: string;
    birthTime?: string;
    yatra?: string;
    timezone?: string;
    dob?: string;
    roleChangeCooldownUntil?: string;
}

interface UserContextType {
    user: UserProfile | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    shouldShowPortalBootLoader: boolean;
    roleDescriptor: PortalBlueprint | null;
    godModeFilters: MathFilter[];
    activeMathId: string | null;
    login: (profile: UserProfile, authPayload?: any) => Promise<void>;
    completePortalBootLoader: () => void;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    setTourCompleted: () => Promise<void>;
    updateUserProfile: (patch: Partial<UserProfile>) => Promise<void>;
    loadUserProfile: () => Promise<void>;
    setRoleDescriptor: (descriptor: PortalBlueprint | null) => void;
    setGodModeFilters: (filters: MathFilter[]) => void;
    setActiveMath: (mathId: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const PRESENCE_RESYNC_MIN_INTERVAL_MS = 30 * 1000;

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [shouldShowPortalBootLoader, setShouldShowPortalBootLoader] = useState(false);
    const [roleDescriptor, setRoleDescriptor] = useState<PortalBlueprint | null>(null);
    const [godModeFilters, setGodModeFilters] = useState<MathFilter[]>([]);
    const [activeMathId, setActiveMathId] = useState<string | null>(null);
    const lastPresenceSyncAtRef = useRef(0);
    const appStateRef = useRef(AppState.currentState);
    const networkSignatureRef = useRef<string | null>(null);


    const clearLocalSession = useCallback(async () => {
        setUser(null);
        setShouldShowPortalBootLoader(false);
        setRoleDescriptor(null);
        setGodModeFilters([]);
        setActiveMathId(null);
        clearContactsCaches(queryClient);
        mmkvDeleteMultiple(['user', 'pushToken', 'active_math_id']);
        await clearAuthTokens();
        await AsyncStorage.multiRemove(['user', 'pushToken', 'active_math_id']);
    }, []);

    const logout = useCallback(async () => {
        try {
            const rawPushToken = await AsyncStorage.getItem('pushToken');
            const pushToken = rawPushToken && rawPushToken !== 'undefined' && rawPushToken !== 'null'
                ? rawPushToken
                : '';
            let deviceId = '';
            try {
                deviceId = await DeviceInfo.getUniqueId();
            } catch {
                deviceId = '';
            }

            if (pushToken || deviceId) {
                await contactService.unregisterPushToken({
                    token: pushToken || undefined,
                    deviceId: deviceId || undefined,
                });
            }
        } catch (error) {
            console.warn('[UserContext] Failed to unregister push token on logout:', error);
        }

        try {
            await logoutAuthSession();
        } catch (error) {
            console.warn('[UserContext] Failed to sync logout session:', error);
        }
        await clearLocalSession();
        console.log('[UserContext] Session cleared (Logged out)');
    }, [clearLocalSession]);

    const loadUser = useCallback(async () => {
        try {
            const savedUser = mmkvGetString('user') || await AsyncStorage.getItem('user');
            const savedToken = await getAccessToken();
            const savedActiveMath = mmkvGetString('active_math_id') || await AsyncStorage.getItem('active_math_id');

            if (savedUser && savedUser !== 'undefined' && savedUser !== 'null' &&
                savedToken && savedToken !== 'undefined' && savedToken !== 'null') {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    mmkvSetString('user', savedUser);
                } catch {
                    console.warn('[UserContext] Failed to parse saved user, clearing storage');
                    await clearLocalSession();
                }
            } else {
                setUser(null);
            }
            if (savedActiveMath && savedActiveMath !== 'undefined' && savedActiveMath !== 'null') {
                setActiveMathId(savedActiveMath);
                mmkvSetString('active_math_id', savedActiveMath);
            }
        } catch {
            console.warn('[UserContext] Failed to load user from storage');
        } finally {
            setIsLoading(false);
        }
    }, [clearLocalSession]);

    useEffect(() => {
        loadUser().catch(() => undefined);
    }, [loadUser]);

    const loadUserProfile = useCallback(async () => {
        if (!user?.ID) {
            console.log('[UserContext] No user ID, skipping profile load');
            return;
        }
        try {
            console.log('[UserContext] Loading profile for user:', user.ID);
            const response = await apiClient.get<any[] | { items?: any[] }>('/contacts');
            const contacts = Array.isArray(response.data)
                ? response.data
                : (Array.isArray(response.data?.items) ? response.data.items : []);
            const userData = contacts.find((u: any) => u.ID === user.ID);

            if (userData) {
                const updatedUser: UserProfile = {
                    ...user,
                    ...userData,
                    latitude: userData.latitude || user.latitude,
                    longitude: userData.longitude || user.longitude
                };
                setUser(updatedUser);
                mmkvSetString('user', JSON.stringify(updatedUser));
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                console.log('[UserContext] Profile loaded successfully');
            }
        } catch (error) {
            console.warn('[UserContext] Failed to load user profile:', error);
        }
    }, [user]);

    useEffect(() => {
        if (user?.ID) {
            loadUserProfile().catch(() => undefined);
        }
    }, [user?.ID, loadUserProfile]);

    const refreshPresenceQueries = useCallback(async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'active' }),
            queryClient.invalidateQueries({ queryKey: ['contacts-meta'], refetchType: 'active' }),
        ]);
    }, []);

    const syncPresence = useCallback(async (reason: string, force: boolean = false) => {
        if (!user?.ID) {
            return;
        }

        const now = Date.now();
        if (!force && now - lastPresenceSyncAtRef.current < PRESENCE_RESYNC_MIN_INTERVAL_MS) {
            return;
        }
        lastPresenceSyncAtRef.current = now;

        const sendHeartbeat = async () => {
            await contactService.sendHeartbeat(user.ID);
            await refreshPresenceQueries();
            console.log(`[UserContext] Presence synced (${reason})`);
        };

        try {
            await sendHeartbeat();
        } catch (error: any) {
            if (error.message === 'UNAUTHORIZED' || error.status === 401) {
                const refreshed = await refreshAuthTokens();
                if (refreshed?.accessToken) {
                    console.log(`[UserContext] Heartbeat recovered via refresh (${reason})`);
                    await sendHeartbeat();
                    return;
                }

                console.warn('[UserContext] Heartbeat auth refresh failed, logging out');
                await logout();
                return;
            }

            console.warn(`[UserContext] Presence sync failed (${reason})`, error);
        }
    }, [logout, refreshPresenceQueries, user?.ID]);

    useEffect(() => {
        let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
        if (user?.ID) {
            // Initial heartbeat
            syncPresence('session-start', true).catch(() => undefined);

            // Register push token
            AsyncStorage.getItem('pushToken').then(async token => {
                if (token && token !== 'undefined' && token !== 'null') {
                    try {
                        const deviceId = await DeviceInfo.getUniqueId();
                        const appVersion = DeviceInfo.getVersion();
                        await contactService.registerPushToken({
                            token,
                            provider: 'fcm',
                            platform: Platform.OS,
                            deviceId,
                            appVersion,
                        });
                    } catch (error) {
                        console.error('[UserContext] Failed to register push token:', error);
                    }
                }
            });

            // Set up interval (every 10 minutes — server throttles writes to 5min)
            heartbeatInterval = setInterval(() => {
                syncPresence('interval', true).catch(() => undefined);
            }, 10 * 60 * 1000);
        }
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [syncPresence, user?.ID]);

    useEffect(() => {
        appStateRef.current = AppState.currentState;
        if (!user?.ID) {
            return;
        }

        const subscription = AppState.addEventListener('change', (nextState) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextState;
            const resumed = (previousState === 'background' || previousState === 'inactive') && nextState === 'active';
            if (resumed) {
                syncPresence('app-foreground').catch(() => undefined);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [syncPresence, user?.ID]);

    useEffect(() => {
        if (!user?.ID) {
            networkSignatureRef.current = null;
            return;
        }

        const buildSignature = (state: { type?: string; isConnected?: boolean | null; isInternetReachable?: boolean | null }) => {
            const reachable = state.isInternetReachable;
            const isOnline = Boolean(state.isConnected) && reachable !== false;
            return `${isOnline ? 'online' : 'offline'}:${state.type || 'unknown'}`;
        };

        const handleNetInfoChange = (state: { type?: string; isConnected?: boolean | null; isInternetReachable?: boolean | null }) => {
            const nextSignature = buildSignature(state);
            const previousSignature = networkSignatureRef.current;
            networkSignatureRef.current = nextSignature;

            if (!previousSignature || previousSignature === nextSignature || !nextSignature.startsWith('online:')) {
                return;
            }

            syncPresence(`network:${previousSignature}->${nextSignature}`).catch(() => undefined);
        };

        const unsubscribe = NetInfo.addEventListener(handleNetInfoChange);
        NetInfo.fetch()
            .then((state) => {
                networkSignatureRef.current = buildSignature(state);
            })
            .catch(() => undefined);

        return () => {
            networkSignatureRef.current = null;
            unsubscribe();
        };
    }, [syncPresence, user?.ID]);

    useEffect(() => {
        if (activeMathId) {
            mmkvSetString('active_math_id', activeMathId);
            AsyncStorage.setItem('active_math_id', activeMathId).catch(() => undefined);
        } else {
            mmkvDeleteMultiple(['active_math_id']);
            AsyncStorage.removeItem('active_math_id').catch(() => undefined);
        }
    }, [activeMathId]);

    const login = useCallback(async (profile: UserProfile, authPayload?: any) => {
        console.log('[GoogleAuth] UserContext.login:start');
        if (typeof authPayload === 'string' && authPayload.trim()) {
            console.log('[GoogleAuth] UserContext.login:saveAuthTokens:string');
            await saveAuthTokens({ accessToken: authPayload, token: authPayload });
        } else if (authPayload && typeof authPayload === 'object') {
            console.log('[GoogleAuth] UserContext.login:saveAuthTokens:object');
            await saveAuthTokens(authPayload);
        }
        console.log('[GoogleAuth] UserContext.login:saveAuthTokens:done');
        mmkvSetString('user', JSON.stringify(profile));
        console.log('[GoogleAuth] UserContext.login:mmkvSetUser:done');
        await AsyncStorage.setItem('user', JSON.stringify(profile));
        console.log('[GoogleAuth] UserContext.login:asyncStorageSetUser:done');
        setShouldShowPortalBootLoader(true);
        setUser(profile);
        console.log('[GoogleAuth] UserContext.login:setUser:done');
    }, []);

    const completePortalBootLoader = useCallback(() => {
        setShouldShowPortalBootLoader(false);
    }, []);

    const deleteAccount = useCallback(async () => {
        await accountService.deleteAccountNow();
        await clearLocalSession();
        console.log('[UserContext] Session cleared (Account deleted)');
    }, [clearLocalSession]);

    const setTourCompleted = useCallback(async () => {
        if (user) {
            const updatedUser = { ...user, isTourCompleted: true };
            setUser(updatedUser);
            mmkvSetString('user', JSON.stringify(updatedUser));
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }
    }, [user]);

    const updateUserProfile = useCallback(async (patch: Partial<UserProfile>) => {
        setUser((currentUser) => {
            if (!currentUser) {
                return currentUser;
            }
            const updatedUser = { ...currentUser, ...patch };
            const serialized = JSON.stringify(updatedUser);
            mmkvSetString('user', serialized);
            AsyncStorage.setItem('user', serialized).catch(() => undefined);
            return updatedUser;
        });
    }, []);

    const contextValue = useMemo(
        () => ({
            user,
            isLoggedIn: !!user,
            isLoading,
            shouldShowPortalBootLoader,
            roleDescriptor,
            godModeFilters,
            activeMathId,
            login,
            completePortalBootLoader,
            logout,
            deleteAccount,
            setTourCompleted,
            updateUserProfile,
            loadUserProfile,
            setRoleDescriptor,
            setGodModeFilters,
            setActiveMath: setActiveMathId,
        }),
        [
            user,
            isLoading,
            shouldShowPortalBootLoader,
            roleDescriptor,
            godModeFilters,
            activeMathId,
            login,
            completePortalBootLoader,
            logout,
            deleteAccount,
            setTourCompleted,
            updateUserProfile,
            loadUserProfile,
        ],
    );

    return (
        <UserContext.Provider value={contextValue}>
            {isLoading ? null : children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
