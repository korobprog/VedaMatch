import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Modal,
    ActivityIndicator,
    FlatList,
    Alert
} from 'react-native';
import { useSettings } from './context/SettingsContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

interface SettingsDrawerProps {
    isVisible: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    onSelectModel: (model: any) => void;
    currentModel: string;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
    isVisible,
    onClose,
    isDarkMode,
    onSelectModel,
    currentModel
}) => {
    const { models, loadingModels, fetchModels } = useSettings();
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const [currentView, setCurrentView] = useState<'main' | 'ai_settings'>('main');

    const [activeFilters, setActiveFilters] = useState({
        text: false,
        image: false,
        audio: false,
        video: false
    });

    const toggleFilter = (type: keyof typeof activeFilters) => {
        setActiveFilters(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    // Manage expanded sections independently
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const theme = isDarkMode ? {
        background: '#1E1E1E',
        text: '#E0E0E0',
        border: '#333333',
        overlay: 'rgba(0,0,0,0.5)',
        sectionBg: '#2C2C2C',
        activeFilterBg: '#444444',
        inactiveFilterBg: '#2C2C2C',
        menuItemBg: '#2C2C2C'
    } : {
        background: '#FFFFFF',
        text: '#212121',
        border: '#E0E0E0',
        overlay: 'rgba(0,0,0,0.5)',
        sectionBg: '#F5F5F0',
        activeFilterBg: '#E0E0E0',
        inactiveFilterBg: '#F5F5F0',
        menuItemBg: '#F9F9F9'
    };

    useEffect(() => {
        if (isVisible) {
            setCurrentView('main'); // Reset to main view on open
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
            // Models are fetched by Context on mount, but we can trigger refresh if needed or just rely on cache
            fetchModels();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible]);

    // Local fetch removed, using Context
    const loading = loadingModels;

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(overlayAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const handleBack = () => {
        setCurrentView('main');
    };

    const renderModelItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.modelItem,
                { borderBottomColor: theme.border },
                currentModel === item.id && styles.selectedModel
            ]}
            onPress={() => onSelectModel(item)}
        >
            <View>
                <Text style={[styles.modelName, { color: theme.text }]}>{item.id}</Text>
                <Text style={[styles.modelProvider, { color: theme.text, opacity: 0.6 }]}>{item.provider}</Text>
            </View>
            {currentModel === item.id && <Text style={{ color: theme.text, fontWeight: 'bold' }}>✓</Text>}
        </TouchableOpacity>
    );

    const renderMainContent = () => (
        <View style={styles.menuContainer}>
            <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: theme.border, backgroundColor: theme.menuItemBg }]}
                onPress={() => setCurrentView('ai_settings')}
            >
                <Text style={[styles.menuItemText, { color: theme.text }]}>AI Models</Text>
                <Text style={{ color: theme.text, opacity: 0.5 }}>›</Text>
            </TouchableOpacity>
            {/* Add more settings options here in the future */}
        </View>
    );

    const renderAISettingsContent = () => (
        <View style={styles.content}>
            <View style={[styles.sectionHeader, { borderBottomColor: theme.border, backgroundColor: theme.sectionBg, paddingLeft: 36 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Model</Text>
            </View>

            {/* Filters */}
            <View style={{ flexDirection: 'row', padding: 10, paddingLeft: 36, gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(activeFilters).map((key) => {
                    const filterKey = key as keyof typeof activeFilters;
                    const isActive = activeFilters[filterKey];
                    return (
                        <TouchableOpacity
                            key={key}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: isActive ? theme.activeFilterBg : theme.inactiveFilterBg,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: isActive ? theme.text : theme.border,
                                marginRight: 8,
                                marginBottom: 8
                            }}
                            onPress={() => toggleFilter(filterKey)}
                        >
                            <Text style={{
                                color: theme.text,
                                fontSize: 12,
                                fontWeight: isActive ? 'bold' : 'normal'
                            }}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loadingModels ? (
                <ActivityIndicator color={theme.text} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={['text', 'image', 'audio', 'video', 'other']}
                    keyExtractor={(item) => item}
                    renderItem={({ item: category }) => {
                        // Filter logic relies on active filters
                        const anyFilterActive = Object.values(activeFilters).some(v => v);

                        // If filters are active, skip categories that are not selected
                        if (anyFilterActive) {
                            if (category !== 'other' && !activeFilters[category as keyof typeof activeFilters]) {
                                return null;
                            }
                            if (category === 'other') return null;
                        }

                        // Filter models for this category
                        const categoryModels = models.filter((m: any) => {
                            if (m.capabilities) {
                                if (category === 'text') return m.capabilities.text;
                                if (category === 'image') return m.capabilities.image;
                                if (category === 'audio') return m.capabilities.audio;
                                if (category === 'video') return m.capabilities.video;
                            }

                            // Fallback logic
                            if (category === 'text') return !m.category || m.category === 'text' || m.id.includes('gpt') || m.id.includes('llama') || m.id.includes('claude');
                            if (category === 'image') return m.category === 'image' || m.id.includes('dall') || m.id.includes('midjourney') || m.id.includes('stable');
                            if (category === 'audio') return m.category === 'audio' || m.id.includes('whisper') || m.id.includes('tts');
                            if (category === 'video') return m.category === 'video';
                            return m.category === category;
                        });

                        if (categoryModels.length === 0) return null;

                        const isExpanded = !!expandedSections[category];
                        const title = category.charAt(0).toUpperCase() + category.slice(1) + ' Models';

                        return (
                            <View>
                                <TouchableOpacity
                                    style={[styles.categoryHeader, { borderBottomColor: theme.border, paddingLeft: 36 }]}
                                    onPress={() => toggleSection(category)}
                                >
                                    <Text style={[styles.categoryTitle, { color: theme.text }]}>{title} ({categoryModels.length})</Text>
                                    <Text style={{ color: theme.text, fontSize: 12 }}>{isExpanded ? '▼' : '▶'}</Text>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View>
                                        {categoryModels.map((model) => (
                                            <View key={model.id}>
                                                {renderModelItem({ item: model })}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    }}
                    style={styles.list}
                />
            )}
        </View>
    );

    return (
        <Modal
            transparent
            visible={isVisible}
            onRequestClose={handleClose}
            animationType="none"
        >
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.overlay,
                        {
                            backgroundColor: theme.overlay,
                            opacity: overlayAnim
                        }
                    ]}
                >
                    <TouchableOpacity style={styles.overlayTouch} onPress={handleClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.drawer,
                        {
                            backgroundColor: theme.background,
                            transform: [{ translateX: slideAnim }],
                            width: DRAWER_WIDTH
                        }
                    ]}
                >
                    <View style={[styles.header, { borderBottomColor: theme.border, paddingLeft: 20 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {currentView === 'ai_settings' && (
                                <TouchableOpacity onPress={handleBack} style={{ marginRight: 15, padding: 5 }}>
                                    <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
                                </TouchableOpacity>
                            )}
                            <Text style={[styles.title, { color: theme.text }]}>
                                {currentView === 'main' ? 'Settings' : 'AI Models'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={[styles.closeBtn, { color: theme.text }]}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {currentView === 'main' ? renderMainContent() : renderAISettingsContent()}

                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayTouch: {
        flex: 1,
    },
    drawer: {
        flex: 1,
        height: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 5,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 40, // Status bar spacer
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    backBtn: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeBtn: {
        fontSize: 24,
    },
    content: {
        flex: 1,
    },
    menuContainer: {
        flex: 1,
        padding: 16,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderBottomWidth: 1,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    sectionContent: {
        flex: 1,
        padding: 16,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    subLabel: {
        marginBottom: 8,
        fontSize: 14,
        opacity: 0.7,
    },
    selectedDisplay: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 5,
    },
    list: {
        flex: 1,
    },
    modelItem: {
        paddingVertical: 12,
        paddingLeft: 44, // Added padding to fix clipping
        paddingRight: 16,
        borderBottomWidth: 0.5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedModel: {
        backgroundColor: 'rgba(128,128,128,0.1)',
    },
    modelName: {
        fontWeight: 'medium',
        marginBottom: 2,
        fontSize: 15,
    },
    modelProvider: {
        fontSize: 12,
    }
});
