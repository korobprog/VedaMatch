import useSWR from 'swr';
import { useState } from 'react';
import api from '@/lib/api';

export interface OpenRouterStatus {
    status: 'online' | 'offline';
    workerUrl: string;
    configured: boolean;
    health?: {
        status: string;
        version: string;
        hasApiKey: boolean;
    };
    models?: {
        fast: string;
        reasoning: string;
    };
    error?: string;
}

export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    pricing?: {
        prompt: string;
        completion: string;
    };
    context_length?: number;
}

export interface ModelRecommendation {
    category: string;
    name: string;
    description: string;
    models: {
        id: string;
        name: string;
        price: string;
    }[];
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export const useOpenRouter = () => {
    const [isTesting, setIsTesting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [testResult, setTestResult] = useState<{ query: string; response: string } | null>(null);

    const { data: status, error: statusError, mutate: mutateStatus } = useSWR<OpenRouterStatus>(
        '/admin/openrouter/status',
        fetcher,
        { refreshInterval: 30000 }
    );

    const { data: modelsData, error: modelsError, mutate: mutateModels } = useSWR<{ data: OpenRouterModel[]; count: number }>(
        '/admin/openrouter/models',
        fetcher
    );

    const { data: recommendationsData } = useSWR<{ recommendations: ModelRecommendation[] }>(
        '/admin/openrouter/recommendations',
        fetcher
    );

    const updateSettings = async (settings: {
        workerUrl?: string;
        fastModel?: string;
        reasoningModel?: string;
        rateLimitPerMin?: number;
    }) => {
        setIsUpdating(true);
        try {
            await api.put('/admin/openrouter/settings', settings);
            await mutateStatus();
            return true;
        } catch (err) {
            console.error('Failed to update settings', err);
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    const testConnection = async () => {
        setIsTesting(true);
        try {
            const res = await api.post('/admin/openrouter/test');
            await mutateStatus();
            return res.data;
        } catch (err) {
            console.error('Failed to test connection', err);
            throw err;
        } finally {
            setIsTesting(false);
        }
    };

    const testSmartRouting = async (query: string, model?: string) => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await api.post('/admin/openrouter/test-routing', { query, model });
            setTestResult({ query, response: res.data.response });
            return res.data;
        } catch (err) {
            console.error('Failed to test smart routing', err);
            throw err;
        } finally {
            setIsTesting(false);
        }
    };

    return {
        status,
        statusLoading: !status && !statusError,
        statusError,

        models: modelsData?.data || [],
        modelsCount: modelsData?.count || 0,
        modelsLoading: !modelsData && !modelsError,
        modelsError,

        recommendations: recommendationsData?.recommendations || [],

        isTesting,
        isUpdating,
        testResult,

        updateSettings,
        testConnection,
        testSmartRouting,

        refresh: () => {
            mutateStatus();
            mutateModels();
        }
    };
};
