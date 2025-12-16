import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getAvailableModels } from '../services/openaiService';
import { modelsConfig } from '../config/models.config';
import { Alert } from 'react-native';

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
    fetchModels: (force?: boolean) => Promise<void>;
    selectModel: (modelId: string, provider: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [models, setModels] = useState<Model[]>([]);
    const [currentModel, setCurrentModel] = useState<string>(modelsConfig.text.model);
    const [currentProvider, setCurrentProvider] = useState<string>(modelsConfig.text.provider || '');
    const [loadingModels, setLoadingModels] = useState<boolean>(false);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);

    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

    const fetchModels = async (force: boolean = false) => {
        const now = Date.now();
        // Cache check: if we have models and not forcing update, check if cache is valid (10 min)
        if (models.length > 0 && !force && (now - lastFetchTime < CACHE_DURATION)) {
            console.log('Using cached models list (valid for 10 min)');
            return;
        }

        setLoadingModels(true);
        try {
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
            console.error('Failed to fetch models:', error);
            Alert.alert('Error', 'Failed to load AI models. Using default configuration.');
        } finally {
            setLoadingModels(false);
        }
    };

    const selectModel = (modelId: string, provider: string) => {
        setCurrentModel(modelId);
        setCurrentProvider(provider);
        console.log(`Model switched to: ${modelId} (${provider})`);
    };

    // Initial fetch on mount? 
    // Maybe better to lazy load when drawer opens, but user asked for "cached list".
    // We can fetch on app start silently.
    useEffect(() => {
        fetchModels();
    }, []);

    return (
        <SettingsContext.Provider value={{
            models,
            currentModel,
            currentProvider,
            loadingModels,
            fetchModels,
            selectModel
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
