import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
    karmicName: string;
    spiritualName?: string;
    avatar?: string;
    email?: string;
}

interface UserContextType {
    user: UserProfile | null;
    isLoggedIn: boolean;
    login: (profile: UserProfile) => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const savedUser = await AsyncStorage.getItem('user_profile');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
        } catch (e) {
            console.error('Failed to load user', e);
        }
    };

    const login = async (profile: UserProfile) => {
        setUser(profile);
        await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('user_profile');
    };

    return (
        <UserContext.Provider value={{
            user,
            isLoggedIn: !!user,
            login,
            logout
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
