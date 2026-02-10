import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../components/chat/ChatConstants';

type ModelFilterKey = 'text' | 'image' | 'audio' | 'video';

export interface AIModel {
    id: string;
    provider: string;
    category?: string;
    capabilities?: Partial<Record<ModelFilterKey, boolean>>;
}

interface AIModelsSectionProps {
    models: AIModel[];
    loadingModels: boolean;
    currentModel: string;
    onSelectModel: (modelId: string, provider: string) => void;
    theme: typeof COLORS.dark;
    colors: { accent: string };
    t: (key: string) => string;
    onTap: () => void;
}

const MODEL_FILTER_KEYS: ModelFilterKey[] = ['text', 'image', 'audio', 'video'];

const isModelInCategory = (model: AIModel, category: ModelFilterKey) => {
    if (model.capabilities?.[category]) {
        return true;
    }

    const id = model.id.toLowerCase();
    if (category === 'text') {
        return !model.category || model.category === 'text' || id.includes('gpt') || id.includes('llama') || id.includes('claude');
    }
    if (category === 'image') {
        return model.category === 'image' || id.includes('dall') || id.includes('midjourney') || id.includes('stable');
    }
    if (category === 'audio') {
        return model.category === 'audio' || id.includes('whisper') || id.includes('tts');
    }
    return model.category === 'video';
};

const ModelListItem = memo(({
    item,
    theme,
    currentModel,
    onSelectModel,
}: {
    item: AIModel;
    theme: typeof COLORS.dark;
    currentModel: string;
    onSelectModel: (item: AIModel) => void;
}) => {
    const isSelected = currentModel === item.id;

    return (
        <TouchableOpacity
            style={[
                styles.modelItem,
                { borderBottomColor: theme.borderColor },
                isSelected && { backgroundColor: theme.button + '20' },
            ]}
            onPress={() => onSelectModel(item)}
        >
            <View>
                <Text style={[styles.modelName, { color: theme.text }]}>{item.id}</Text>
                <Text style={[styles.modelProvider, { color: theme.subText }]}>{item.provider}</Text>
            </View>
            {isSelected && <Text style={{ color: theme.accent, fontWeight: 'bold' }}>✓</Text>}
        </TouchableOpacity>
    );
});

ModelListItem.displayName = 'ModelListItem';

export const AIModelsSection = memo(({
    models,
    loadingModels,
    currentModel,
    onSelectModel,
    theme,
    colors,
    t,
    onTap,
}: AIModelsSectionProps) => {
    const [activeFilters, setActiveFilters] = useState<Record<ModelFilterKey, boolean>>({
        text: false,
        image: false,
        audio: false,
        video: false,
    });
    const [expandedSections, setExpandedSections] = useState<Record<ModelFilterKey, boolean>>({
        text: false,
        image: false,
        audio: false,
        video: false,
    });

    const categorizedModels = useMemo(() => {
        const grouped: Record<ModelFilterKey, AIModel[]> = {
            text: [],
            image: [],
            audio: [],
            video: [],
        };

        for (const model of models) {
            for (const category of MODEL_FILTER_KEYS) {
                if (isModelInCategory(model, category)) {
                    grouped[category].push(model);
                }
            }
        }

        return grouped;
    }, [models]);

    const anyFilterActive = useMemo(
        () => MODEL_FILTER_KEYS.some((category) => activeFilters[category]),
        [activeFilters],
    );

    const handleToggleFilter = useCallback((category: ModelFilterKey) => {
        onTap();
        setActiveFilters((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    }, [onTap]);

    const handleToggleSection = useCallback((category: ModelFilterKey) => {
        onTap();
        setExpandedSections((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    }, [onTap]);

    const handleSelectModel = useCallback((item: AIModel) => {
        onSelectModel(item.id, item.provider);
    }, [onSelectModel]);

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.aiModels')}</Text>

            <View style={styles.filtersContainer}>
                {MODEL_FILTER_KEYS.map((filterKey) => {
                    const isActive = activeFilters[filterKey];
                    return (
                        <TouchableOpacity
                            key={filterKey}
                            activeOpacity={0.88}
                            style={[
                                styles.filterBtn,
                                {
                                    backgroundColor: isActive ? colors.accent : theme.inputBackground,
                                    borderColor: isActive ? colors.accent : theme.borderColor,
                                },
                            ]}
                            onPress={() => handleToggleFilter(filterKey)}
                        >
                            <Text style={{ color: isActive ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                                {t(`settings.${filterKey}` as any)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loadingModels ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
            ) : !anyFilterActive ? (
                <View style={styles.summaryContainer}>
                    <Text style={[styles.summaryText, { color: theme.text }]}>
                        {t('settings.availableModels')}: {models.length}
                    </Text>
                    <Text style={[styles.hintText, { color: theme.subText }]}>
                        {t('settings.selectCategoryHint')}
                    </Text>
                </View>
            ) : (
                MODEL_FILTER_KEYS.map((category) => {
                    if (!activeFilters[category]) {
                        return null;
                    }

                    const categoryModels = categorizedModels[category];
                    if (categoryModels.length === 0) {
                        return null;
                    }

                    const isExpanded = expandedSections[category];
                    return (
                        <View key={category} style={styles.categoryContainer}>
                            <TouchableOpacity
                                activeOpacity={0.88}
                                style={[
                                    styles.categoryHeader,
                                    {
                                        borderBottomColor: theme.borderColor,
                                        backgroundColor: isExpanded ? theme.inputBackground + '40' : 'transparent',
                                    },
                                ]}
                                onPress={() => handleToggleSection(category)}
                            >
                                <Text style={[styles.categoryTitle, { color: theme.text }]}>
                                    {t(`settings.${category}` as any)} ({categoryModels.length})
                                </Text>
                                <Text style={{ color: theme.text, fontSize: 14 }}>
                                    {isExpanded ? '▼' : '▶'}
                                </Text>
                            </TouchableOpacity>
                            {isExpanded && (
                                <View style={styles.modelList}>
                                    {categoryModels.map((item) => (
                                        <ModelListItem
                                            key={`${item.provider}-${item.id}`}
                                            item={item}
                                            theme={theme}
                                            currentModel={currentModel}
                                            onSelectModel={handleSelectModel}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    );
                })
            )}
        </View>
    );
});

AIModelsSection.displayName = 'AIModelsSection';

const styles = StyleSheet.create({
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    filtersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 15,
    },
    filterBtn: {
        minHeight: 36,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryContainer: {
        marginBottom: 10,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderBottomWidth: 0.5,
    },
    categoryTitle: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    modelList: {
        paddingLeft: 10,
    },
    modelItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 0.5,
    },
    modelName: {
        fontSize: 15,
        fontWeight: '500',
    },
    modelProvider: {
        fontSize: 12,
    },
    summaryContainer: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 12,
        marginTop: 10,
    },
    summaryText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});
