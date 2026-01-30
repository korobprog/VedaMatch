import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { contactService } from '../services/contactService';

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
}

interface UserContextType {
    user: UserProfile | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (profile: UserProfile, token?: string) => Promise<void>;
    logout: () => Promise<void>;
    setTourCompleted: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);


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
            AsyncStorage.getItem('pushToken').then(token => {
                if (token && token !== 'undefined' && token !== 'null') {
                    contactService.updatePushToken(token);
                }
            });

            // Set up interval (every 3 minutes)
            heartbeatInterval = setInterval(runHeartbeat, 3 * 60 * 1000);
        }
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user?.ID]);

    const loadUser = async () => {
        try {
            const savedUser = await AsyncStorage.getItem('user');
            const savedToken = await AsyncStorage.getItem('token');

            if (savedUser && savedUser !== 'undefined' && savedUser !== 'null' &&
                savedToken && savedToken !== 'undefined' && savedToken !== 'null') {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (parseError) {
                    console.warn('[UserContext] Failed to parse saved user, clearing storage');
                    await logout();
                }
            } else {
                setUser(null);
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
            login,
            logout,
            setTourCompleted
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
