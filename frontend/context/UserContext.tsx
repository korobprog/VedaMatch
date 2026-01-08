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
            // Initial heartbeat
            contactService.sendHeartbeat(user.ID);

            // Set up interval (every 3 minutes)
            heartbeatInterval = setInterval(() => {
                contactService.sendHeartbeat(user.ID!);
            }, 3 * 60 * 1000);
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
                setUser(JSON.parse(savedUser));
            } else {
                // If any is missing, clear both to be safe
                await AsyncStorage.removeItem('user');
                await AsyncStorage.removeItem('token');
                setUser(null);
            }
        } catch (e) {
            console.error('Failed to load user', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (profile: UserProfile, token?: string) => {
        setUser(profile);
        await AsyncStorage.setItem('user', JSON.stringify(profile));
        if (token) {
            await AsyncStorage.setItem('token', token);
        }
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
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
