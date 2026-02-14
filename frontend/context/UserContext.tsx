import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { contactService } from '../services/contactService';
import { MathFilter, PortalBlueprint } from '../types/portalBlueprint';

interface UserProfile {
    karmicName: string;
    spiritualName?: string;
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
}

interface UserContextType {
    user: UserProfile | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    roleDescriptor: PortalBlueprint | null;
    godModeFilters: MathFilter[];
    activeMathId: string | null;
    login: (profile: UserProfile, token?: string) => Promise<void>;
    logout: () => Promise<void>;
    setTourCompleted: () => Promise<void>;
    setRoleDescriptor: (descriptor: PortalBlueprint | null) => void;
    setGodModeFilters: (filters: MathFilter[]) => void;
    setActiveMath: (mathId: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [roleDescriptor, setRoleDescriptor] = useState<PortalBlueprint | null>(null);
    const [godModeFilters, setGodModeFilters] = useState<MathFilter[]>([]);
    const [activeMathId, setActiveMathId] = useState<string | null>(null);


    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        let heartbeatInterval: NodeJS.Timeout;
        if (user?.ID) {
            const runHeartbeat = async () => {
                try {
                    await contactService.sendHeartbeat(user.ID!);
                } catch (error: any) {
                    if (error.message === 'UNAUTHORIZED' || error.status === 401) {
                        console.error('[UserContext] Heartbeat failed with 401, logging out');
                        logout();
                    }
                }
            };

            // Initial heartbeat
            runHeartbeat();

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

            // Set up interval (every 3 minutes)
            heartbeatInterval = setInterval(runHeartbeat, 3 * 60 * 1000);
        }
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user?.ID]);

    useEffect(() => {
        if (activeMathId) {
            AsyncStorage.setItem('active_math_id', activeMathId).catch(() => undefined);
        } else {
            AsyncStorage.removeItem('active_math_id').catch(() => undefined);
        }
    }, [activeMathId]);

    const loadUser = async () => {
        try {
            const savedUser = await AsyncStorage.getItem('user');
            const savedToken = await AsyncStorage.getItem('token');
            const savedActiveMath = await AsyncStorage.getItem('active_math_id');

            if (savedUser && savedUser !== 'undefined' && savedUser !== 'null' &&
                savedToken && savedToken !== 'undefined' && savedToken !== 'null') {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                } catch (parseError) {
                    console.warn('[UserContext] Failed to parse saved user, clearing storage');
                    await logout();
                }
            } else {
                setUser(null);
            }
            if (savedActiveMath && savedActiveMath !== 'undefined' && savedActiveMath !== 'null') {
                setActiveMathId(savedActiveMath);
            }
        } catch (e) {
            console.warn('[UserContext] Failed to load user from storage');
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (profile: UserProfile, token?: string) => {
        if (token) {
            await AsyncStorage.setItem('token', token);
        }
        await AsyncStorage.setItem('user', JSON.stringify(profile));
        setUser(profile);
    };

    const logout = async () => {
        setUser(null);
        setRoleDescriptor(null);
        setGodModeFilters([]);
        setActiveMathId(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        console.log('[UserContext] Session cleared (Logged out)');
    };

    const setTourCompleted = async () => {
        if (user) {
            const updatedUser = { ...user, isTourCompleted: true };
            setUser(updatedUser);
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    return (
        <UserContext.Provider value={{
            user,
            isLoggedIn: !!user,
            isLoading,
            roleDescriptor,
            godModeFilters,
            activeMathId,
            login,
            logout,
            setTourCompleted,
            setRoleDescriptor,
            setGodModeFilters,
            setActiveMath: setActiveMathId
        }}>
            {children}
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
