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
}

interface UserContextType {
    user: UserProfile | null;
    isLoggedIn: boolean;
    login: (profile: UserProfile) => Promise<void>;
    logout: () => Promise<void>;
    setTourCompleted: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);


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
            if (savedUser && savedUser !== 'undefined') {
                setUser(JSON.parse(savedUser));
            }
        } catch (e) {
            console.error('Failed to load user', e);
        }
    };

    const login = async (profile: UserProfile) => {
        setUser(profile);
        await AsyncStorage.setItem('user', JSON.stringify(profile));
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('user');
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
