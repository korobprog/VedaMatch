import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { modelsConfig } from '../config/models.config';
import { useUser } from './UserContext';
import { Alert, useColorScheme } from 'react-native';
import { COLORS } from '../components/chat/ChatConstants';

interface Model {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    provider: string;
    category?: string;
}

interface SettingsContextType {
    models: Model[];
    currentModel: string;
    currentProvider: string;
    loadingModels: boolean;
    imageSize: number;
    imagePosition: 'left' | 'center' | 'right';
    fetchModels: (force?: boolean) => Promise<void>;
    selectModel: (modelId: string, provider: string) => void;
    setImageSize: (size: number) => void;
    setImagePosition: (position: 'left' | 'center' | 'right') => void;
    defaultMenuTab: 'portal' | 'history';
    setDefaultMenuTab: (tab: 'portal' | 'history') => void;
    theme: typeof COLORS.dark;
    isDarkMode: boolean;
    isAutoMagicEnabled: boolean;
    toggleAutoMagic: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [models, setModels] = useState<Model[]>([]);
    const [currentModel, setCurrentModel] = useState<string>(modelsConfig.text.model);
    const [currentProvider, setCurrentProvider] = useState<string>(modelsConfig.text.provider || '');
    const [loadingModels, setLoadingModels] = useState<boolean>(false);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);
    const [imageSize, setImageSize] = useState<number>(280);
    const [imagePosition, setImagePosition] = useState<'left' | 'center' | 'right'>('left');
    const [defaultMenuTab, setDefaultMenuTabState] = useState<'portal' | 'history'>('portal');
    const [isAutoMagicEnabled, setIsAutoMagicEnabled] = useState<boolean>(true);

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const { isLoggedIn } = useUser();

    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

    const fetchModels = async (force: boolean = false) => {
        const now = Date.now();
        // Cache check: if we have models and not forcing update, check if cache is valid (10 min)
        if (models.length > 0 && !force && (now - lastFetchTime < CACHE_DURATION)) {
            console.log('Using cached models list (valid for 10 min)');
            return;
        }

        if (!isLoggedIn) {
            console.log('Skipping model fetch: User not logged in');
            return;
        }

        setLoadingModels(true);
        try {
            // Lazy import to avoid potential circular dependencies and ensure we have auth headers
            const { getAvailableModels } = require('../services/openaiService');
            const data = await getAvailableModels();

            // Store ALL unique models, let UI handle categorization
            const allModels = data.data || [];

            // Deduplicate by ID
            const uniqueModels = allModels.filter((model: any, index: number, self: any[]) =>
                index === self.findIndex((t) => t.id === model.id)
            );

            // Sort by ID
            const sortedModels = uniqueModels.sort((a: any, b: any) =>
                a.id.localeCompare(b.id)
            );

            setModels(sortedModels);
            setLastFetchTime(Date.now());
            console.log('Models loaded and cached:', sortedModels.length);

            // Validate current model exists in new list, if not, fallback or warn
            // (Optional: logic to reset if current model disappears)
        } catch (error: any) {
            console.warn('Failed to fetch models:', error?.message || 'Unknown error');
            // Silent failure, UI will show empty list or use defaults
        } finally {
            setLoadingModels(false);
        }
    };

    const selectModel = (modelId: string, provider: string) => {
        setCurrentModel(modelId);
        setCurrentProvider(provider);
        console.log(`Model switched to: ${modelId} (${provider})`);
    };

    const toggleAutoMagic = async () => {
        const newValue = !isAutoMagicEnabled;
        setIsAutoMagicEnabled(newValue);
        try {
            await AsyncStorage.setItem('auto_magic_enabled', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save auto magic settings', e);
        }
    };

    // Initial fetch on mount? 
    // Maybe better to lazy load when drawer opens, but user asked for "cached list".
    // We can fetch on app start silently.
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const tab = await AsyncStorage.getItem('default_menu_tab');
                if (tab === 'history' || tab === 'portal') {
                    setDefaultMenuTabState(tab);
                }

                const autoMagic = await AsyncStorage.getItem('auto_magic_enabled');
                if (autoMagic !== null && autoMagic !== 'undefined' && autoMagic !== 'null') {
                    setIsAutoMagicEnabled(JSON.parse(autoMagic));
                }
            } catch (e) {
                console.error('Failed to load menu settings', e);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchModels();
        }
    }, [isLoggedIn]);

    const setDefaultMenuTab = async (tab: 'portal' | 'history') => {
        setDefaultMenuTabState(tab);
        try {
            await AsyncStorage.setItem('default_menu_tab', tab);
        } catch (e) {
            console.error('Failed to save menu settings', e);
        }
    };

    return (
        <SettingsContext.Provider value={{
            models,
            currentModel,
            currentProvider,
            loadingModels,
            fetchModels,
            selectModel,
            imageSize,
            imagePosition,
            setImageSize,
            setImagePosition,
            defaultMenuTab,
            setDefaultMenuTab,
            theme,
            isDarkMode,
            isAutoMagicEnabled,
            toggleAutoMagic,
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
