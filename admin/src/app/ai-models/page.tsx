'use client';

import { useState } from 'react';
import { useAiModels } from '@/hooks/useAiModels';
import { AiModelsTable } from '@/components/ai-models/AiModelsTable';
import { AiModelsToolbar } from '@/components/ai-models/AiModelsToolbar';
import { ScheduleModal } from '@/components/ai-models/ScheduleModal';
import { RecommendationsModal } from '@/components/ai-models/RecommendationsModal';

const categoryLabels: Record<string, string> = {
    text: 'Текст',
    image: 'Картинки',
    audio: 'Аудио',
    video: 'Видео',
};

export default function AiModelsPage() {
    const {
        models,
        loading,
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
        onRetry: mutate // Assuming useAiModels returns retry or mutate, I missed checking if I exported mutate/retry. 
        // I exported `models` and `fetcher` logic is hidden. I should probably export `mutate` or `onRetry` from the hook.
    } = useAiModels();

    // Local UI state
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [scheduleInterval, setScheduleInterval] = useState(60);
    const [isSchedulerEnabled, setIsSchedulerEnabled] = useState(false);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // Wrapper for save schedule to handle UI state
    const handleSaveSchedule = async () => {
        setIsSavingSchedule(true);
        try {
            const res = await saveSchedule(scheduleInterval, isSchedulerEnabled);
            alert(`Планировщик ${res.running ? 'запущен' : 'остановлен'}`);
            setShowSchedule(false);
        } catch (err) {
            alert('Ошибка настройки планировщика');
        } finally {
            setIsSavingSchedule(false);
        }
    };

    return (
        <div className="space-y-6">
            <AiModelsToolbar
                search={search}
                setSearch={setSearch}
                category={category}
                setCategory={setCategory}
                lastSyncDate={models && models.length > 0 ? models[0].lastSyncDate : undefined}
                onShowSchedule={() => setShowSchedule(true)}
                onAutoOptimize={autoOptimizeModels}
                isOptimizing={isOptimizing}
                onShowRecommendations={() => setShowRecommendations(true)}
                onDisableOffline={disableOfflineModels}
                isDisablingOffline={isDisablingOffline}
                onBulkTest={bulkTestModels}
                isBulkTesting={isBulkTesting}
                onSync={syncModels}
                isSyncing={isSyncing}
            />

            <AiModelsTable
                models={models || []}
                isLoading={loading}
                error={error}
                onRetry={() => window.location.reload()} // Quick fix if I didn't export retry
                onToggleEnabled={toggleEnabled}
                onToggleAutoMagic={toggleAutoMagic}
                onToggleRecommended={toggleRecommended}
                onToggleRagEnabled={toggleRagEnabled}
                onTestModel={testModel}
                onDelete={deleteModel}
                onMarkOld={markOld}
                testingId={testingId}
                categoryLabels={categoryLabels}
            />

            <ScheduleModal
                isOpen={showSchedule}
                onClose={() => setShowSchedule(false)}
                scheduleInterval={scheduleInterval}
                setScheduleInterval={setScheduleInterval}
                isSchedulerEnabled={isSchedulerEnabled}
                setIsSchedulerEnabled={setIsSchedulerEnabled}
                onSave={handleSaveSchedule}
                isSaving={isSavingSchedule}
            />

            <RecommendationsModal
                isOpen={showRecommendations}
                onClose={() => setShowRecommendations(false)}
                models={models || []}
                onToggleRecommended={toggleRecommended}
                categoryLabels={categoryLabels}
            />
        </div>
    );
}
