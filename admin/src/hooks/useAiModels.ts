import useSWR from 'swr';
import { useState } from 'react';
import api from '@/lib/api';
import { Model } from '@/components/ai-models/AiModelsTable';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export const useAiModels = () => {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isBulkTesting, setIsBulkTesting] = useState(false);
    const [isDisablingOffline, setIsDisablingOffline] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);

    const { data: models, error, mutate } = useSWR<Model[]>(
        `/admin/ai-models?search=${search}&category=${category}`,
        fetcher
    );

    const syncModels = async () => {
        setIsSyncing(true);
        try {
            await api.post('/admin/ai-models/sync');
            mutate();
        } catch (err) {
            console.error('Failed to sync models', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const bulkTestModels = async () => {
        setIsBulkTesting(true);
        try {
            await api.post('/admin/ai-models/bulk-test');
            mutate();
        } catch (err) {
            console.error('Failed to bulk test models', err);
        } finally {
            setIsBulkTesting(false);
        }
    };

    const disableOfflineModels = async () => {
        if (!confirm('Отключить все оффлайн модели?')) return;
        setIsDisablingOffline(true);
        try {
            const res = await api.post('/admin/ai-models/disable-offline');
            alert(`Отключено моделей: ${res.data.disabled}`);
            mutate();
        } catch (err) {
            console.error('Failed to disable offline models', err);
        } finally {
            setIsDisablingOffline(false);
        }
    };

    const autoOptimizeModels = async () => {
        setIsOptimizing(true);
        try {
            const res = await api.post('/admin/ai-models/auto-optimize');
            alert(`Оптимизация завершена! Включено авто-определение для ${res.data.auto_magic_enabled} моделей.`);
            mutate();
        } catch (err) {
            console.error('Failed to optimize models', err);
            alert('Ошибка оптимизации');
        } finally {
            setIsOptimizing(false);
        }
    };

    const toggleEnabled = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isEnabled: !currentStatus });
            mutate();
        } catch (err) {
            console.error('Failed to toggle model status', err);
        }
    };

    const toggleRecommended = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isRecommended: !currentStatus });
            mutate();
        } catch (err) {
            console.error('Failed to toggle recommendation status', err);
        }
    };

    const toggleRagEnabled = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isRagEnabled: !currentStatus });
            mutate();
        } catch (err) {
            console.error('Failed to toggle RAG status', err);
        }
    };

    const toggleAutoMagic = async (id: number) => {
        try {
            await api.post(`/admin/ai-models/${id}/toggle-auto`);
            mutate();
        } catch (err) {
            console.error('Failed to toggle Auto-Magic status', err);
        }
    };

    const testModel = async (id: number) => {
        setTestingId(id);
        try {
            await api.post(`/admin/ai-models/${id}/test`);
            mutate();
        } catch (err) {
            console.error('Failed to test model', err);
        } finally {
            setTestingId(null);
        }
    };

    const deleteModel = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту модель из списка?')) return;
        try {
            await api.delete(`/admin/ai-models/${id}`);
            mutate();
        } catch (err) {
            console.error('Failed to delete model', err);
        }
    };

    const markOld = async (id: number) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isNew: false });
            mutate();
        } catch (err) {
            console.error('Failed to update model', err);
        }
    };

    const saveSchedule = async (intervalMinutes: number, enabled: boolean) => {
        try {
            const res = await api.post('/admin/ai-models/schedule', {
                intervalMinutes,
                enabled
            });
            return res.data;
        } catch (err) {
            console.error('Failed to update schedule', err);
            throw err;
        }
    };

    return {
        models,
        loading: !models && !error,
        error,
        search,
        setSearch,
        category,
        setCategory,
        isSyncing,
        syncModels,
        isBulkTesting,
        bulkTestModels,
        isDisablingOffline,
        disableOfflineModels,
        isOptimizing,
        autoOptimizeModels,
        testingId,
        testModel,
        toggleEnabled,
        toggleRecommended,
        toggleRagEnabled,
        toggleAutoMagic,
        deleteModel,
        markOld,
        saveSchedule,
        onRetry: mutate
    };
};
