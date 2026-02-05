import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    useColorScheme,
    ActivityIndicator,
    Platform,
    StatusBar,
    ScrollView,
    Switch,
    Alert,
    Image as RNImage,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { Palette, Image as ImageIcon } from 'lucide-react-native';
import { COLORS } from '../../components/chat/ChatConstants';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useLocation } from '../../hooks/useLocation';
import { useWallet } from '../../context/WalletContext';
import { Wallet, Users, ChevronRight } from 'lucide-react-native';

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
        isAutoMagicEnabled,
        toggleAutoMagic,
        vTheme,
        themeMode,
        setThemeMode,
        portalBackground,
        portalBackgroundType,
        setPortalBackground,
    } = useSettings();

    const { logout } = useUser();
    const { refreshLocationData } = useLocation();
    const { wallet, loading: walletLoading } = useWallet();

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

    const handlePickImage = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
        });

        if (result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            if (uri) {
                setPortalBackground(uri, 'image');
            }
        }
    };

    const PRESET_COLORS = ['#ffffff', '#f5f5f5', '#1a1a1a', '#2c3e50', '#8e44ad', '#e67e22'];
    const PRESET_GRADIENTS = [
        '#FF9D6C|#FF4D4D', // Sunset
        '#4facfe|#00f2fe', // Cool Blue
        '#43e97b|#38f9d7', // Forest
        '#fa709a|#fee140', // Peach
        '#6a11cb|#2575fc', // Deep Sea
    ];

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
        <SafeAreaView style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: vTheme.colors.background, borderBottomColor: vTheme.colors.divider }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: vTheme.colors.text }]}>← {t('settings.appSettings')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: vTheme.colors.divider }]}>
                    <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('settings.profile') || 'Profile'}</Text>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider }
                        ]}
                        onPress={() => navigation.navigate('EditProfile' as any)}
                    >
                        <View style={styles.actionContent}>
                            <Text style={[styles.actionTitle, { color: vTheme.colors.text }]}>
                                {t('profile.editProfile') || 'Edit Profile'}
                            </Text>
                            <Text style={[styles.actionDescription, { color: vTheme.colors.textSecondary }]}>
                                {t('profile.editProfileDesc') || 'Update your personal information'}
                            </Text>
                        </View>
                        <Text style={{ color: vTheme.colors.textSecondary }}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Wallet Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: vTheme.colors.divider }]}>
                    <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>Мой счёт</Text>

                    {/* Balance Card */}
                    <TouchableOpacity
                        style={[
                            styles.walletCard,
                            { backgroundColor: vTheme.colors.backgroundSecondary }
                        ]}
                        onPress={() => navigation.navigate('Wallet' as any)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.walletMain}>
                            <View style={[styles.walletIconContainer, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                                <Wallet size={24} color="#F59E0B" />
                            </View>
                            <View style={styles.walletInfo}>
                                <Text style={[styles.walletLabel, { color: vTheme.colors.textSecondary }]}>
                                    Доступно
                                </Text>
                                <View style={styles.walletBalanceRow}>
                                    <Text style={styles.walletBalance}>
                                        {walletLoading ? '...' : (wallet?.balance ?? 0)}
                                    </Text>
                                    <Text style={styles.walletCurrency}>LKM</Text>
                                </View>
                                {(wallet?.pendingBalance ?? 0) > 0 && (
                                    <Text style={styles.walletPending}>
                                        +{wallet?.pendingBalance} в ожидании
                                    </Text>
                                )}
                            </View>
                        </View>
                        <ChevronRight size={20} color={vTheme.colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Invite Friends Button */}
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }
                        ]}
                        onPress={() => navigation.navigate('InviteFriends' as any)}
                    >
                        <View style={styles.actionContent}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Users size={20} color="#22C55E" />
                                <Text style={[styles.actionTitle, { color: vTheme.colors.text }]}>
                                    Пригласить друзей
                                </Text>
                            </View>
                            <Text style={[styles.actionDescription, { color: vTheme.colors.textSecondary }]}>
                                Получите 100 LKM за каждого активного друга
                            </Text>
                        </View>
                        <ChevronRight size={20} color="#22C55E" />
                    </TouchableOpacity>
                </View>

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

                {/* Theme Settings Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: vTheme.colors.divider }]}>
                    <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('settings.theme.title')}</Text>
                    <View style={styles.sizeOptions}>
                        {(['light', 'dark', 'system'] as const).map(mode => (
                            <TouchableOpacity
                                key={mode}
                                style={[
                                    styles.sizeBtn,
                                    {
                                        backgroundColor: themeMode === mode ? vTheme.colors.primary : vTheme.colors.backgroundSecondary,
                                        borderColor: vTheme.colors.divider
                                    }
                                ]}
                                onPress={() => setThemeMode(mode)}
                            >
                                <Text style={{ color: themeMode === mode ? '#fff' : vTheme.colors.text, fontWeight: '500' }}>
                                    {t(`settings.theme.${mode}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>



                {/* Auto-Magic Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 5 }]}>Auto-Magic</Text>
                            <Text style={[styles.subLabel, { color: theme.subText, marginBottom: 0, maxWidth: '90%' }]}>
                                Автоматически выбирать лучшую модель для ваших запросов
                            </Text>
                        </View>
                        <Switch
                            value={isAutoMagicEnabled}
                            onValueChange={toggleAutoMagic}
                            trackColor={{ false: theme.inputBackground, true: theme.button }}
                            thumbColor={isAutoMagicEnabled ? '#fff' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Portal Appearance Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: vTheme.colors.divider }]}>
                    <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>Вид портала</Text>

                    <Text style={[styles.subLabel, { color: vTheme.colors.textSecondary }]}>Цвета</Text>
                    <View style={styles.presetsGrid}>
                        {PRESET_COLORS.map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.presetItem,
                                    { backgroundColor: color, borderColor: vTheme.colors.divider },
                                    portalBackground === color && styles.selectedPreset
                                ]}
                                onPress={() => setPortalBackground(color, 'color')}
                            />
                        ))}
                    </View>

                    <Text style={[styles.subLabel, { color: vTheme.colors.textSecondary, marginTop: 15 }]}>Градиенты</Text>
                    <View style={styles.presetsGrid}>
                        {PRESET_GRADIENTS.map(grad => (
                            <TouchableOpacity
                                key={grad}
                                onPress={() => setPortalBackground(grad, 'gradient')}
                                style={[
                                    styles.presetItem,
                                    portalBackground === grad && styles.selectedPreset
                                ]}
                            >
                                <LinearGradient
                                    colors={grad.split('|')}
                                    style={styles.gradientPreset}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.subLabel, { color: vTheme.colors.textSecondary, marginTop: 15 }]}>Свой фон</Text>
                    <View style={styles.imageRow}>
                        <TouchableOpacity
                            style={[
                                styles.imagePickerBtn,
                                { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider }
                            ]}
                            onPress={handlePickImage}
                        >
                            <ImageIcon size={24} color={vTheme.colors.primary} />
                            <Text style={[styles.imagePickerText, { color: vTheme.colors.text }]}>Выбрать из галереи</Text>
                        </TouchableOpacity>

                        {portalBackgroundType === 'image' && (
                            <View style={styles.previewContainer}>
                                <RNImage source={{ uri: portalBackground }} style={styles.imagePreview} />
                                <View style={styles.checkOverlay}>
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                                </View>
                            </View>
                        )}
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

                {/* Location Cache Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.location')}</Text>
                    <Text style={[styles.subLabel, { color: theme.subText }]}>
                        {t('settings.locationCacheDescription')}
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.sizeBtn,
                            {
                                backgroundColor: theme.button,
                                borderColor: theme.button,
                                marginTop: 10
                            }
                        ]}
                        onPress={async () => {
                            await refreshLocationData();
                            Alert.alert(
                                t('settings.locationCacheCleared'),
                                t('settings.locationCacheClearedMsg'),
                                [{ text: t('common.ok') }]
                            );
                        }}
                    >
                        <Text style={{ color: theme.buttonText, fontWeight: '500' }}>{t('settings.clearLocationCache')}</Text>
                    </TouchableOpacity>
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
            </ScrollView >
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
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 10,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 14,
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 5,
    },
    presetItem: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    selectedPreset: {
        borderColor: '#FF9933',
        transform: [{ scale: 1.1 }],
    },
    gradientPreset: {
        flex: 1,
    },
    imageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginTop: 5,
    },
    imagePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
        flex: 1,
    },
    imagePickerText: {
        fontSize: 15,
        fontWeight: '500',
    },
    previewContainer: {
        width: 50,
        height: 50,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FF9933',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    checkOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(255,153,51,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    walletCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    walletMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    walletIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    walletInfo: {
        gap: 2,
    },
    walletLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    walletBalanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    walletBalance: {
        fontSize: 24,
        fontWeight: '700',
        color: '#F59E0B',
        fontFamily: 'Cinzel-Bold',
    },
    walletCurrency: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    walletPending: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
});
