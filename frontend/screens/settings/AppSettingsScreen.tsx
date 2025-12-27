import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    useColorScheme,
    FlatList,
    ActivityIndicator,
    Platform,
    StatusBar,
    ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../components/chat/ChatConstants';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';

export const AppSettingsScreen: React.FC<any> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const {
        models,
        loadingModels,
        currentModel,
        selectModel,
        imageSize,
        setImageSize,
        defaultMenuTab,
        setDefaultMenuTab
    } = useSettings();

    const { logout } = useUser();

    const [activeFilters, setActiveFilters] = useState({
        text: false,
        image: false,
        audio: false,
        video: false
    });

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const toggleFilter = (type: keyof typeof activeFilters) => {
        setActiveFilters(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const renderModelItem = (item: any) => (
        <TouchableOpacity
            key={item.id}
            style={[
                styles.modelItem,
                { borderBottomColor: theme.borderColor },
                currentModel === item.id && { backgroundColor: theme.button + '20' }
            ]}
            onPress={() => selectModel(item.id, item.provider)}
        >
            <View>
                <Text style={[styles.modelName, { color: theme.text }]}>{item.id}</Text>
                <Text style={[styles.modelProvider, { color: theme.subText }]}>{item.provider}</Text>
            </View>
            {currentModel === item.id && <Text style={{ color: theme.accent, fontWeight: 'bold' }}>✓</Text>}
        </TouchableOpacity>
    );

    const sizes = [200, 240, 280, 320, 360];

    const anyFilterActive = Object.values(activeFilters).some(v => v);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: theme.text }]}>← {t('settings.appSettings')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Image Settings Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.imageSettings')}</Text>
                    <Text style={[styles.subLabel, { color: theme.subText }]}>{t('settings.imageSize')} ({imageSize}px)</Text>
                    <View style={styles.sizeOptions}>
                        {sizes.map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[
                                    styles.sizeBtn,
                                    {
                                        backgroundColor: imageSize === s ? theme.button : theme.inputBackground,
                                        borderColor: theme.borderColor
                                    }
                                ]}
                                onPress={() => setImageSize(s)}
                            >
                                <Text style={{ color: imageSize === s ? theme.buttonText : theme.text }}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Menu Settings Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.menuSettings')}</Text>
                    <Text style={[styles.subLabel, { color: theme.subText }]}>{t('settings.defaultTab')}</Text>
                    <View style={styles.sizeOptions}>
                        <TouchableOpacity
                            style={[
                                styles.sizeBtn,
                                {
                                    backgroundColor: defaultMenuTab === 'portal' ? theme.button : theme.inputBackground,
                                    borderColor: theme.borderColor
                                }
                            ]}
                            onPress={() => setDefaultMenuTab('portal')}
                        >
                            <Text style={{ color: defaultMenuTab === 'portal' ? theme.buttonText : theme.text }}>{t('settings.title')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.sizeBtn,
                                {
                                    backgroundColor: defaultMenuTab === 'history' ? theme.button : theme.inputBackground,
                                    borderColor: theme.borderColor
                                }
                            ]}
                            onPress={() => setDefaultMenuTab('history')}
                        >
                            <Text style={{ color: defaultMenuTab === 'history' ? theme.buttonText : theme.text }}>{t('chat.history')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Language Settings Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.language')}</Text>
                    <View style={styles.sizeOptions}>
                        <TouchableOpacity
                            style={[
                                styles.sizeBtn,
                                {
                                    backgroundColor: i18n.language === 'ru' ? theme.button : theme.inputBackground,
                                    borderColor: theme.borderColor
                                }
                            ]}
                            onPress={() => i18n.changeLanguage('ru')}
                        >
                            <Text style={{ color: i18n.language === 'ru' ? theme.buttonText : theme.text }}>Русский</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.sizeBtn,
                                {
                                    backgroundColor: i18n.language === 'en' ? theme.button : theme.inputBackground,
                                    borderColor: theme.borderColor
                                }
                            ]}
                            onPress={() => i18n.changeLanguage('en')}
                        >
                            <Text style={{ color: i18n.language === 'en' ? theme.buttonText : theme.text }}>English</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* AI Models Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.aiModels')}</Text>


                    {/* Filters */}
                    <View style={styles.filtersContainer}>
                        {Object.keys(activeFilters).map((key) => {
                            const filterKey = key as keyof typeof activeFilters;
                            const isActive = activeFilters[filterKey];
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.filterBtn,
                                        {
                                            backgroundColor: isActive ? theme.button : theme.inputBackground,
                                            borderColor: theme.borderColor
                                        }
                                    ]}
                                    onPress={() => toggleFilter(filterKey)}
                                >
                                    <Text style={{ color: isActive ? theme.buttonText : theme.text, fontSize: 12 }}>
                                        {t(`settings.${key}` as any)}
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
                        ['text', 'image', 'audio', 'video', 'other'].map(category => {
                            if (category !== 'other' && !activeFilters[category as keyof typeof activeFilters]) return null;
                            if (category === 'other') return null;

                            const categoryModels = models.filter((m: any) => {
                                if (m.capabilities) {
                                    if (category === 'text') return m.capabilities.text;
                                    if (category === 'image') return m.capabilities.image;
                                    if (category === 'audio') return m.capabilities.audio;
                                    if (category === 'video') return m.capabilities.video;
                                }
                                if (category === 'text') return !m.category || m.category === 'text' || m.id.includes('gpt') || m.id.includes('llama') || m.id.includes('claude');
                                if (category === 'image') return m.category === 'image' || m.id.includes('dall') || m.id.includes('midjourney') || m.id.includes('stable');
                                if (category === 'audio') return m.category === 'audio' || m.id.includes('whisper') || m.id.includes('tts');
                                if (category === 'video') return m.category === 'video';
                                return m.category === category;
                            });

                            if (categoryModels.length === 0) return null;

                            const isExpanded = !!expandedSections[category];
                            return (
                                <View key={category} style={styles.categoryContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.categoryHeader,
                                            {
                                                borderBottomColor: theme.borderColor,
                                                backgroundColor: isExpanded ? theme.inputBackground + '40' : 'transparent'
                                            }
                                        ]}
                                        onPress={() => toggleSection(category)}
                                        activeOpacity={0.7}
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
                                            {categoryModels.map(renderModelItem)}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Logout Section */}
                <View style={[styles.section, { borderBottomWidth: 0, marginTop: 20, marginBottom: 40 }]}>
                    <TouchableOpacity
                        style={[
                            styles.sizeBtn,
                            {
                                backgroundColor: theme.error || '#FF4444',
                                borderColor: theme.error || '#FF4444',
                                alignItems: 'center',
                                paddingVertical: 15
                            }
                        ]}
                        onPress={logout}
                    >
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                            {t('auth.logout') || 'Logout'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 20,
    },
    backButton: { padding: 8 },
    backText: { fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1 },
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
    subLabel: {
        fontSize: 14,
        marginBottom: 10,
    },
    sizeOptions: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    sizeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
    },
    filtersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 15,
    },
    filterBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        borderWidth: 1,
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
    }
});
