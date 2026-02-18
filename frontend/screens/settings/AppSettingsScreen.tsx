import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar,
    ScrollView,
    Switch,
    Alert,
    Image as RNImage,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { Image as ImageIcon, Sparkles, Trash2, Plus, Clock, Users, ChevronRight, LifeBuoy } from 'lucide-react-native';
import { COLORS } from '../../components/chat/ChatConstants';
import { SLIDESHOW_INTERVALS } from '../../config/wallpaperPresets';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useLocation } from '../../hooks/useLocation';
import { useWallet } from '../../context/WalletContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { usePressFeedback } from '../../hooks/usePressFeedback';
import { AIModelsSection, AIModel } from './components/AIModelsSection';

type AssistantType = 'feather' | 'smiley' | 'feather2';
type SettingsPanelKey = 'quick' | 'appearance' | 'background' | 'ai' | 'location' | 'models';
const SETTINGS_PANELS_STORAGE_KEY = 'settings_screen_expanded_panels_v1';

const IMAGE_SIZE_OPTIONS = [200, 240, 280, 320, 360];
const THEME_MODE_OPTIONS: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
const PRESET_COLORS = ['#ffffff', '#f5f5f5', '#1a1a1a', '#2c3e50', '#8e44ad', '#e67e22'];
const PRESET_GRADIENTS = [
    '#FF9D6C|#FF4D4D',
    '#4facfe|#00f2fe',
    '#43e97b|#38f9d7',
    '#fa709a|#fee140',
    '#6a11cb|#2575fc',
];
const ASSISTANT_OPTIONS: Array<{
    key: AssistantType;
    label: string;
    image: number;
    activeBorder: string;
    activeBackground: string;
}> = [
        {
            key: 'feather2',
            label: 'Перо 2',
            image: require('../../assets/nano_banano.png'),
            activeBorder: '#10B981',
            activeBackground: 'rgba(16,185,129,0.1)',
        },
        {
            key: 'feather',
            label: 'Перо',
            image: require('../../assets/peacockAssistant.png'),
            activeBorder: '#00838F',
            activeBackground: 'rgba(0,131,143,0.1)',
        },
        {
            key: 'smiley',
            label: 'Колобок',
            image: require('../../assets/krishnaAssistant.png'),
            activeBorder: '#F59E0B',
            activeBackground: 'rgba(245,158,11,0.1)',
        },
    ];

interface SettingsNavigation {
    goBack: () => void;
    navigate: (screen: string, params?: unknown) => void;
}

interface AppSettingsScreenProps {
    navigation: SettingsNavigation;
}

export const AppSettingsScreen: React.FC<AppSettingsScreenProps> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
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
        assistantType,
        setAssistantType,
        isDarkMode,
        wallpaperSlides,
        isSlideshowEnabled,
        slideshowInterval,
        setIsSlideshowEnabled,
        setSlideshowInterval,
        addWallpaperSlide,
        removeWallpaperSlide,
        portalIconStyle,
        setPortalIconStyle,
    } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const { logout, user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const triggerTapFeedback = usePressFeedback();
    const { refreshLocationData } = useLocation();
    const { wallet, loading: walletLoading, totalBalance, bonusBalance } = useWallet();
    const [mediaActionInProgress, setMediaActionInProgress] = useState(false);
    const [portalBackgroundBusy, setPortalBackgroundBusy] = useState(false);
    const [locationActionInProgress, setLocationActionInProgress] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleGoBack = useCallback(() => {
        triggerTapFeedback();
        navigation.goBack();
    }, [navigation, triggerTapFeedback]);

    const applyPortalBackground = useCallback(async (value: string, type: 'image' | 'color' | 'gradient') => {
        if (portalBackgroundBusy) {
            return;
        }

        setPortalBackgroundBusy(true);
        try {
            await setPortalBackground(value, type);
        } catch (error) {
            console.warn('Failed to apply portal background:', error);
            Alert.alert(t('common.error'), t('common.tryAgain') || 'Попробуйте позже');
        } finally {
            if (isMountedRef.current) {
                setPortalBackgroundBusy(false);
            }
        }
    }, [portalBackgroundBusy, setPortalBackground, t]);

    const pickImageUri = useCallback(async (): Promise<string | null> => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
        });

        if (result.didCancel) {
            return null;
        }
        if (result.errorCode) {
            throw new Error(result.errorMessage || result.errorCode);
        }
        const uri = result.assets?.[0]?.uri;
        return uri || null;
    }, []);

    const handlePickImage = useCallback(async () => {
        if (mediaActionInProgress) {
            return;
        }
        setMediaActionInProgress(true);
        try {
            const uri = await pickImageUri();
            if (!uri) return;
            await applyPortalBackground(uri, 'image');
        } catch (error) {
            console.warn('Failed to pick image:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать изображение');
        } finally {
            if (isMountedRef.current) {
                setMediaActionInProgress(false);
            }
        }
    }, [applyPortalBackground, mediaActionInProgress, pickImageUri]);

    const handleAddSlideFromGallery = useCallback(async () => {
        if (mediaActionInProgress) {
            return;
        }
        setMediaActionInProgress(true);
        try {
            const uri = await pickImageUri();
            if (!uri) return;
            await addWallpaperSlide(uri);
        } catch (error) {
            console.warn('Failed to add wallpaper slide:', error);
            Alert.alert('Ошибка', 'Не удалось добавить фон');
        } finally {
            if (isMountedRef.current) {
                setMediaActionInProgress(false);
            }
        }
    }, [addWallpaperSlide, mediaActionInProgress, pickImageUri]);

    const handleRemoveSlide = useCallback((uri: string) => {
        if (wallpaperSlides.length <= 1) {
            Alert.alert('Нельзя удалить', 'Должен остаться хотя бы один фон');
            return;
        }
        Alert.alert(
            'Удалить фон?',
            'Этот фон будет убран из слайд-шоу',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => {
                        void removeWallpaperSlide(uri).catch((error) => {
                            console.warn('Failed to remove wallpaper slide:', error);
                            Alert.alert('Ошибка', 'Не удалось удалить фон');
                        });
                    },
                },
            ]
        );
    }, [removeWallpaperSlide, wallpaperSlides.length]);

    const slideshowIntervalLabel = useMemo(() => {
        const matched = SLIDESHOW_INTERVALS.find((item) => item.value === slideshowInterval);
        return matched?.label ?? `${slideshowInterval} сек`;
    }, [slideshowInterval]);
    const themedStyles = useMemo(
        () =>
            StyleSheet.create({
                heroBody: { flex: 1 },
                sectionDivider: { borderBottomWidth: 1 },
                walletIconBg: { backgroundColor: 'rgba(245,158,11,0.15)' },
                inviteCard: {
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    borderColor: 'rgba(34,197,94,0.3)',
                },
                rowCenterGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
                optionTextMedium: { fontWeight: '500' },
                optionTextOnAccent: { color: '#fff', fontWeight: '500' },
                optionTextOnAccentNoWeight: { color: '#fff' },
                optionTextRegular: { color: theme.text },
                optionTextVTheme: { color: vTheme.colors.text },
                checkOverlayText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
                slideshowInfo: { flex: 1 },
                intervalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
                noMarginBottom: { marginBottom: 0 },
                wallpaperBorderActive: { borderColor: '#FF9933' },
                wallpaperBorderInactive: { borderColor: vTheme.colors.divider },
                wallpaperCheckText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
                wallpaperDeleteBg: { backgroundColor: 'rgba(239,68,68,0.9)' },
                aiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                sectionTitleCompact: { marginBottom: 5 },
                locationClearTop: { marginTop: 10 },
                sectionNoDividerSpaced: { borderBottomWidth: 0, marginTop: 20, marginBottom: 40 },
                logoutBtnLayout: { alignItems: 'center', paddingVertical: 15 },
                logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
            }),
        [theme.text, vTheme.colors.divider, vTheme.colors.text]
    );

    const [expandedPanels, setExpandedPanels] = useState<Record<SettingsPanelKey, boolean>>({
        quick: true,
        appearance: false,
        background: false,
        ai: false,
        location: false,
        models: false,
    });
    const hasWallpaperSlides = wallpaperSlides.length > 0;

    const togglePanel = useCallback((panel: SettingsPanelKey) => {
        triggerTapFeedback();
        setExpandedPanels((prev) => ({
            ...prev,
            [panel]: !prev[panel],
        }));
    }, [triggerTapFeedback]);

    useEffect(() => {
        let isMounted = true;
        const loadExpandedPanels = async () => {
            try {
                const saved = await AsyncStorage.getItem(SETTINGS_PANELS_STORAGE_KEY);
                if (!saved) {
                    return;
                }

                const parsed = JSON.parse(saved) as Partial<Record<SettingsPanelKey, boolean>>;
                if (!parsed || typeof parsed !== 'object') {
                    return;
                }

                if (isMounted) {
                    setExpandedPanels((prev) => ({
                        ...prev,
                        ...parsed,
                    }));
                }
            } catch (error) {
                console.warn('Failed to load settings accordion state:', error);
            }
        };

        loadExpandedPanels();
        return () => {
            isMounted = false;
        };
    }, []);

    const changeLanguageSafely = useCallback(async (language: 'ru' | 'en') => {
        triggerTapFeedback();
        try {
            await i18n.changeLanguage(language);
        } catch (error) {
            console.warn('Failed to change language:', error);
            Alert.alert(t('common.error'), t('common.tryAgain') || 'Попробуйте позже');
        }
    }, [i18n, t, triggerTapFeedback]);

    useEffect(() => {
        AsyncStorage.setItem(SETTINGS_PANELS_STORAGE_KEY, JSON.stringify(expandedPanels))
            .catch((error) => {
                console.warn('Failed to save settings accordion state:', error);
            });
    }, [expandedPanels]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: vTheme.colors.background, borderBottomColor: vTheme.colors.divider }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={handleGoBack}
                    style={styles.backButton}
                >
                    <Text style={[styles.backText, { color: vTheme.colors.text }]}>← {t('settings.appSettings')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.heroCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}>
                        <Sparkles size={18} color={colors.accent} />
                    </View>
                    <View style={themedStyles.heroBody}>
                        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Персональные настройки</Text>
                        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>Быстрый доступ к теме, профилю и моделям AI</Text>
                    </View>
                </View>

                {/* Quick Access */}
                <View style={[styles.section, themedStyles.sectionDivider, { borderBottomColor: vTheme.colors.divider }]}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.sectionToggleHeader}
                        onPress={() => togglePanel('quick')}
                    >
                        <View style={styles.sectionToggleTextWrap}>
                            <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>Быстрый доступ</Text>
                            <Text style={[styles.sectionHint, { color: vTheme.colors.textSecondary }]}>Профиль, баланс и приглашения</Text>
                        </View>
                        <Text style={[styles.sectionToggleIcon, { color: vTheme.colors.textSecondary }]}>
                            {expandedPanels.quick ? '▾' : '▸'}
                        </Text>
                    </TouchableOpacity>

                    {expandedPanels.quick && (
                        <>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider }
                                ]}
                                activeOpacity={0.9}
                                onPress={() => {
                                    triggerTapFeedback();
                                    navigation.navigate('EditProfile');
                                }}
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

                            <TouchableOpacity
                                style={[
                                    styles.walletCard,
                                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                                ]}
                                onPress={() => {
                                    triggerTapFeedback();
                                    navigation.navigate('Wallet');
                                }}
                                activeOpacity={0.88}
                            >
                                <View style={styles.walletMain}>
                                    <View style={[styles.walletIconContainer, themedStyles.walletIconBg]}>
                                        <Sparkles size={24} color="#F59E0B" />
                                    </View>
                                    <View style={styles.walletInfo}>
                                        <Text style={[styles.walletLabel, { color: vTheme.colors.textSecondary }]}>
                                            Итого доступно
                                        </Text>
                                        <View style={styles.walletBalanceRow}>
                                            <Text style={styles.walletBalance}>
                                                {walletLoading ? '...' : totalBalance.toLocaleString('ru-RU')}
                                            </Text>
                                            <Text style={styles.walletCurrency}>LKM</Text>
                                            {!walletLoading && bonusBalance > 0 && (
                                                <View style={styles.walletBonusBadge}>
                                                    <Text style={styles.walletBonusText}>
                                                        B: {bonusBalance.toLocaleString('ru-RU')}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {(wallet?.pendingBalance ?? 0) > 0 && (
                                            <Text style={styles.walletPending}>
                                                +{wallet?.pendingBalance.toLocaleString('ru-RU')} в ожидании
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <ChevronRight size={20} color={vTheme.colors.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, themedStyles.inviteCard]}
                                activeOpacity={0.88}
                                onPress={() => {
                                    triggerTapFeedback();
                                    navigation.navigate('InviteFriends');
                                }}
                            >
                                <View style={styles.actionContent}>
                                    <View style={themedStyles.rowCenterGap8}>
                                        <Users size={20} color="#22C55E" />
                                        <Text style={[styles.actionTitle, { color: vTheme.colors.text }]}>
                                            Пригласить друзей
                                        </Text>
                                    </View>
                                    <Text style={[styles.actionDescription, { color: vTheme.colors.textSecondary }]}>
                                        Бонусные 100 LKM за каждого активного друга
                                    </Text>
                                </View>
                                <ChevronRight size={20} color="#22C55E" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: 'rgba(37,99,235,0.1)', borderColor: 'rgba(37,99,235,0.3)' }
                                ]}
                                activeOpacity={0.88}
                                onPress={() => {
                                    triggerTapFeedback();
                                    navigation.navigate('SupportHome', { entryPoint: 'settings' });
                                }}
                            >
                                <View style={styles.actionContent}>
                                    <View style={themedStyles.rowCenterGap8}>
                                        <LifeBuoy size={20} color="#2563EB" />
                                        <Text style={[styles.actionTitle, { color: vTheme.colors.text }]}>
                                            Поддержка
                                        </Text>
                                    </View>
                                    <Text style={[styles.actionDescription, { color: vTheme.colors.textSecondary }]}>
                                        Открыть Telegram или создать обращение в приложении
                                    </Text>
                                </View>
                                <ChevronRight size={20} color="#2563EB" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Appearance Section */}
                <View style={[styles.section, themedStyles.sectionDivider, { borderBottomColor: vTheme.colors.divider }]}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.sectionToggleHeader}
                        onPress={() => togglePanel('appearance')}
                    >
                        <View style={styles.sectionToggleTextWrap}>
                            <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>Внешний вид</Text>
                            <Text style={[styles.sectionHint, { color: vTheme.colors.textSecondary }]}>Тема, язык, ассистент и размер изображений</Text>
                        </View>
                        <Text style={[styles.sectionToggleIcon, { color: vTheme.colors.textSecondary }]}>
                            {expandedPanels.appearance ? '▾' : '▸'}
                        </Text>
                    </TouchableOpacity>

                    {expandedPanels.appearance && (
                        <>
                            <Text style={[styles.subSectionTitle, { color: vTheme.colors.text }]}>Тема приложения</Text>
                            <View style={styles.sizeOptions}>
                                {THEME_MODE_OPTIONS.map((mode) => (
                                    <TouchableOpacity
                                        key={mode}
                                        activeOpacity={0.88}
                                        style={[
                                            styles.sizeBtn,
                                            {
                                                backgroundColor: themeMode === mode ? colors.accent : vTheme.colors.backgroundSecondary,
                                                borderColor: themeMode === mode ? colors.accent : vTheme.colors.divider
                                            }
                                        ]}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            setThemeMode(mode);
                                        }}
                                    >
                                        <Text style={themeMode === mode ? themedStyles.optionTextOnAccent : themedStyles.optionTextVTheme}>
                                            {t(`settings.theme.${mode}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.subSectionTitle, styles.subSectionSpacing, { color: theme.text }]}>{t('settings.language')}</Text>
                            <View style={styles.sizeOptions}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.sizeBtn,
                                        {
                                            backgroundColor: i18n.language === 'ru' ? colors.accent : theme.inputBackground,
                                            borderColor: i18n.language === 'ru' ? colors.accent : theme.borderColor
                                        }
                                    ]}
                                    onPress={() => {
                                        void changeLanguageSafely('ru');
                                    }}
                                >
                                    <Text style={i18n.language === 'ru' ? themedStyles.optionTextOnAccentNoWeight : themedStyles.optionTextRegular}>Русский</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.sizeBtn,
                                        {
                                            backgroundColor: i18n.language === 'en' ? colors.accent : theme.inputBackground,
                                            borderColor: i18n.language === 'en' ? colors.accent : theme.borderColor
                                        }
                                    ]}
                                    onPress={() => {
                                        void changeLanguageSafely('en');
                                    }}
                                >
                                    <Text style={i18n.language === 'en' ? themedStyles.optionTextOnAccentNoWeight : themedStyles.optionTextRegular}>English</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.subSectionTitle, styles.subSectionSpacing, { color: theme.text }]}>Ассистент</Text>
                            <View style={styles.assistantSelection}>
                                {ASSISTANT_OPTIONS.map((assistant) => (
                                    <TouchableOpacity
                                        key={assistant.key}
                                        activeOpacity={0.88}
                                        style={[
                                            styles.assistantBtn,
                                            assistantType === assistant.key && {
                                                borderColor: assistant.activeBorder,
                                                backgroundColor: assistant.activeBackground,
                                            },
                                        ]}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            setAssistantType(assistant.key);
                                        }}
                                    >
                                        <RNImage source={assistant.image} style={styles.assistantPreview} />
                                        <Text style={[styles.assistantName, { color: theme.text }]}>{assistant.label}</Text>
                                        {assistantType === assistant.key && (
                                            <View style={styles.checkBadge}>
                                                <Text style={styles.checkText}>✓</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.subSectionTitle, styles.subSectionSpacing, { color: theme.text }]}>Стиль иконок</Text>
                            <View style={styles.sizeOptions}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.sizeBtn,
                                        {
                                            backgroundColor: portalIconStyle === 'default' ? colors.accent : vTheme.colors.backgroundSecondary,
                                            borderColor: portalIconStyle === 'default' ? colors.accent : vTheme.colors.divider
                                        }
                                    ]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        setPortalIconStyle('default');
                                    }}
                                >
                                    <Text style={portalIconStyle === 'default' ? themedStyles.optionTextOnAccent : themedStyles.optionTextVTheme}>Стандарт</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.sizeBtn,
                                        {
                                            backgroundColor: portalIconStyle === 'colored' ? colors.accent : vTheme.colors.backgroundSecondary,
                                            borderColor: portalIconStyle === 'colored' ? colors.accent : vTheme.colors.divider
                                        }
                                    ]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        setPortalIconStyle('colored');
                                    }}
                                >
                                    <Text style={portalIconStyle === 'colored' ? themedStyles.optionTextOnAccent : themedStyles.optionTextVTheme}>Цветные</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.subSectionTitle, styles.subSectionSpacing, { color: theme.text }]}>
                                {t('settings.imageSize')} ({imageSize}px)
                            </Text>
                            <View style={styles.sizeOptions}>
                                {IMAGE_SIZE_OPTIONS.map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        activeOpacity={0.88}
                                        style={[
                                            styles.sizeBtn,
                                            {
                                                backgroundColor: imageSize === s ? colors.accent : theme.inputBackground,
                                                borderColor: imageSize === s ? colors.accent : theme.borderColor
                                            }
                                        ]}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            setImageSize(s);
                                        }}
                                    >
                                        <Text style={imageSize === s ? themedStyles.optionTextOnAccentNoWeight : themedStyles.optionTextRegular}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                {/* Portal Background Section */}
                <View style={[styles.section, themedStyles.sectionDivider, { borderBottomColor: vTheme.colors.divider }]}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.sectionToggleHeader}
                        onPress={() => togglePanel('background')}
                    >
                        <View style={styles.sectionToggleTextWrap}>
                            <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>Фон портала</Text>
                            <Text style={[styles.sectionHint, { color: vTheme.colors.textSecondary }]}>Выберите стиль фона и настройте автосмену</Text>
                        </View>
                        <Text style={[styles.sectionToggleIcon, { color: vTheme.colors.textSecondary }]}>
                            {expandedPanels.background ? '▾' : '▸'}
                        </Text>
                    </TouchableOpacity>

                    {expandedPanels.background && (
                        <>
                            <Text style={[styles.subSectionTitle, { color: vTheme.colors.text }]}>Свой фон</Text>
                            <View style={styles.imageRow}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.imagePickerBtn,
                                        mediaActionInProgress && styles.disabledControl,
                                        { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider }
                                    ]}
                                    disabled={mediaActionInProgress}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        void handlePickImage();
                                        setIsSlideshowEnabled(false);
                                    }}
                                >
                                    <ImageIcon size={24} color={vTheme.colors.primary} />
                                    <Text style={[styles.imagePickerText, { color: vTheme.colors.text }]}>Выбрать из галереи</Text>
                                </TouchableOpacity>

                                {portalBackgroundType === 'image' && !isSlideshowEnabled && (
                                    <View style={styles.previewContainer}>
                                        <RNImage source={{ uri: portalBackground }} style={styles.imagePreview} />
                                        <View style={styles.checkOverlay}>
                                            <Text style={themedStyles.checkOverlayText}>✓</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.subSectionTitle, styles.subSectionSpacing, { color: vTheme.colors.text }]}>Цвета</Text>
                            <View style={styles.presetsGrid}>
                                {PRESET_COLORS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        activeOpacity={0.88}
                                        style={[
                                            styles.presetItem,
                                            { backgroundColor: color, borderColor: vTheme.colors.divider },
                                            portalBackground === color && styles.selectedPreset
                                        ]}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            void applyPortalBackground(color, 'color');
                                            setIsSlideshowEnabled(false);
                                        }}
                                    />
                                ))}
                            </View>

                            <Text style={[styles.subSectionTitle, styles.subSectionSpacing, { color: vTheme.colors.text }]}>Градиенты</Text>
                            <View style={styles.presetsGrid}>
                                {PRESET_GRADIENTS.map((grad) => (
                                    <TouchableOpacity
                                        key={grad}
                                        activeOpacity={0.88}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            void applyPortalBackground(grad, 'gradient');
                                            setIsSlideshowEnabled(false);
                                        }}
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

                            <View style={[styles.innerDivider, { backgroundColor: vTheme.colors.divider }]} />

                            <View style={styles.slideshowToggle}>
                                <View style={themedStyles.slideshowInfo}>
                                    <Text style={[styles.subSectionTitle, { color: vTheme.colors.text }]}>Автосмена обоев</Text>
                                    <Text style={[styles.slideshowSub, { color: vTheme.colors.textSecondary }]}>
                                        {isSlideshowEnabled
                                            ? `Меняются каждые ${slideshowIntervalLabel}`
                                            : 'Выключена'}
                                    </Text>
                                </View>
                                <Switch
                                    value={isSlideshowEnabled}
                                    onValueChange={(val) => {
                                        triggerTapFeedback();
                                        if (val && !hasWallpaperSlides) {
                                            Alert.alert('Слайд-шоу недоступно', 'Сначала добавьте хотя бы один фон');
                                            return;
                                        }
                                        setIsSlideshowEnabled(val);
                                    }}
                                    trackColor={{ false: vTheme.colors.backgroundSecondary, true: colors.accent }}
                                    thumbColor={isSlideshowEnabled ? '#fff' : '#f4f3f4'}
                                />
                            </View>

                            {isSlideshowEnabled && (
                                <View style={styles.intervalSection}>
                                    <View style={themedStyles.intervalHeader}>
                                        <Clock size={14} color={vTheme.colors.textSecondary} />
                                        <Text style={[styles.subLabel, themedStyles.noMarginBottom, { color: vTheme.colors.textSecondary }]}>Интервал смены</Text>
                                    </View>
                                    <View style={styles.sizeOptions}>
                                        {SLIDESHOW_INTERVALS.map(item => (
                                            <TouchableOpacity
                                                key={item.value}
                                                activeOpacity={0.88}
                                                style={[
                                                    styles.sizeBtn,
                                                    {
                                                        backgroundColor: slideshowInterval === item.value ? colors.accent : vTheme.colors.backgroundSecondary,
                                                        borderColor: slideshowInterval === item.value ? colors.accent : vTheme.colors.divider
                                                    }
                                                ]}
                                                onPress={() => {
                                                    triggerTapFeedback();
                                                    setSlideshowInterval(item.value);
                                                }}
                                            >
                                                <Text style={slideshowInterval === item.value ? themedStyles.optionTextOnAccent : themedStyles.optionTextVTheme}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <Text style={[styles.subSectionTitle, styles.subSectionSpacing, { color: vTheme.colors.text }]}>
                                Обои в ротации ({wallpaperSlides.length})
                            </Text>
                            <View style={styles.wallpapersGrid}>
                                {wallpaperSlides.map((uri, idx) => (
                                    <View key={`slide-${idx}`} style={styles.wallpaperSlideContainer}>
                                        <TouchableOpacity
                                            activeOpacity={0.88}
                                            style={[
                                                styles.wallpaperSlide,
                                                portalBackground === uri ? themedStyles.wallpaperBorderActive : themedStyles.wallpaperBorderInactive,
                                            ]}
                                            onPress={() => {
                                                triggerTapFeedback();
                                                void applyPortalBackground(uri, 'image');
                                            }}
                                        >
                                            <RNImage source={{ uri }} style={styles.wallpaperImage} />
                                            {portalBackground === uri && (
                                                <View style={styles.wallpaperActiveOverlay}>
                                                    <Text style={themedStyles.wallpaperCheckText}>✓</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            style={[styles.wallpaperDeleteBtn, themedStyles.wallpaperDeleteBg]}
                                            onPress={() => {
                                                triggerTapFeedback();
                                                handleRemoveSlide(uri);
                                            }}
                                        >
                                            <Trash2 size={12} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.wallpaperSlide,
                                        styles.wallpaperAddBtn,
                                        mediaActionInProgress && styles.disabledControl,
                                        {
                                            borderColor: vTheme.colors.divider,
                                            backgroundColor: vTheme.colors.backgroundSecondary,
                                        }
                                    ]}
                                    disabled={mediaActionInProgress}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        handleAddSlideFromGallery();
                                    }}
                                >
                                    <Plus size={24} color={colors.accent} />
                                    <Text style={[styles.addSlideText, { color: vTheme.colors.textSecondary }]}>Добавить</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                {/* AI Settings */}
                <View style={[styles.section, themedStyles.sectionDivider, { borderBottomColor: theme.borderColor }]}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.sectionToggleHeader}
                        onPress={() => togglePanel('ai')}
                    >
                        <View style={styles.sectionToggleTextWrap}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>AI настройки</Text>
                            <Text style={[styles.sectionHint, { color: theme.subText }]}>Поведение и автоподбор моделей</Text>
                        </View>
                        <Text style={[styles.sectionToggleIcon, { color: theme.subText }]}>
                            {expandedPanels.ai ? '▾' : '▸'}
                        </Text>
                    </TouchableOpacity>

                    {expandedPanels.ai && (
                        <View style={themedStyles.aiRow}>
                            <View style={styles.actionContent}>
                                <Text style={[styles.sectionTitle, themedStyles.sectionTitleCompact, { color: theme.text }]}>Auto-Magic</Text>
                                <Text style={[styles.subLabel, themedStyles.noMarginBottom, { color: theme.subText }]}>
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
                    )}
                </View>

                {/* Location Cache Section */}
                <View style={[styles.section, themedStyles.sectionDivider, { borderBottomColor: theme.borderColor }]}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.sectionToggleHeader}
                        onPress={() => togglePanel('location')}
                    >
                        <View style={styles.sectionToggleTextWrap}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.location')}</Text>
                            <Text style={[styles.sectionHint, { color: theme.subText }]}>
                                {t('settings.locationCacheDescription')}
                            </Text>
                        </View>
                        <Text style={[styles.sectionToggleIcon, { color: theme.subText }]}>
                            {expandedPanels.location ? '▾' : '▸'}
                        </Text>
                    </TouchableOpacity>

                    {expandedPanels.location && (
                        <TouchableOpacity
                            activeOpacity={0.88}
                            style={[
                                styles.sizeBtn,
                                themedStyles.locationClearTop,
                                locationActionInProgress && styles.disabledControl,
                                {
                                    backgroundColor: colors.accent,
                                    borderColor: colors.accent,
                                },
                            ]}
                            onPress={async () => {
                                if (locationActionInProgress) {
                                    return;
                                }
                                setLocationActionInProgress(true);
                                try {
                                    await refreshLocationData();
                                    if (isMountedRef.current) {
                                        Alert.alert(
                                            t('settings.locationCacheCleared'),
                                            t('settings.locationCacheClearedMsg'),
                                            [{ text: t('common.ok') }]
                                        );
                                    }
                                } catch (error) {
                                    console.warn('Failed to clear location cache:', error);
                                    if (isMountedRef.current) {
                                        Alert.alert(t('common.error'), t('common.tryAgain') || 'Попробуйте позже');
                                    }
                                } finally {
                                    if (isMountedRef.current) {
                                        setLocationActionInProgress(false);
                                    }
                                }
                            }}
                            disabled={locationActionInProgress}
                        >
                            <Text style={[{ color: theme.buttonText }, themedStyles.optionTextMedium]}>{t('settings.clearLocationCache')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={[styles.section, themedStyles.sectionDivider, { borderBottomColor: theme.borderColor }]}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.sectionToggleHeader}
                        onPress={() => togglePanel('models')}
                    >
                        <View style={styles.sectionToggleTextWrap}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Модели AI</Text>
                            <Text style={[styles.sectionHint, { color: theme.subText }]}>Выбор модели по категориям задач</Text>
                        </View>
                        <Text style={[styles.sectionToggleIcon, { color: theme.subText }]}>
                            {expandedPanels.models ? '▾' : '▸'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {expandedPanels.models && (
                    <AIModelsSection
                        models={models as AIModel[]}
                        loadingModels={loadingModels}
                        currentModel={currentModel}
                        onSelectModel={selectModel}
                        theme={theme}
                        colors={colors}
                        t={t}
                        onTap={triggerTapFeedback}
                    />
                )}

                {/* Logout Section */}
                <View style={[styles.section, themedStyles.sectionNoDividerSpaced]}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={[
                            styles.sizeBtn,
                            themedStyles.logoutBtnLayout,
                            {
                                backgroundColor: theme.error || '#FF4444',
                                borderColor: theme.error || '#FF4444',
                            },
                        ]}
                        onPress={() => {
                            triggerTapFeedback();
                            Alert.alert(
                                t('auth.logout') || 'Logout',
                                t('auth.logoutConfirm') || 'Вы уверены, что хотите выйти?',
                                [
                                    { text: t('common.cancel') || 'Отмена', style: 'cancel' },
                                    { text: t('auth.logout') || 'Logout', style: 'destructive', onPress: logout },
                                ]
                            );
                        }}
                    >
                        <Text style={themedStyles.logoutText}>
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
    heroCard: {
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 8,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    heroIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    heroSub: {
        fontSize: 12,
        marginTop: 2,
    },
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
    sectionHint: {
        fontSize: 13,
        marginTop: -8,
        marginBottom: 12,
    },
    sectionToggleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionToggleTextWrap: {
        flex: 1,
        paddingRight: 10,
    },
    sectionToggleIcon: {
        fontSize: 18,
        fontWeight: '700',
    },
    subSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    subSectionSpacing: {
        marginTop: 16,
    },
    innerDivider: {
        height: 1,
        marginTop: 18,
        marginBottom: 14,
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
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
    disabledControl: {
        opacity: 0.5,
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
        borderWidth: 1,
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
    walletBonusBadge: {
        backgroundColor: 'rgba(16,185,129,0.12)',
        borderColor: 'rgba(16,185,129,0.35)',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    walletBonusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
    },
    walletPending: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    assistantSelection: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 5,
    },
    assistantBtn: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    assistantPreview: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
    },
    assistantName: {
        fontSize: 14,
        fontWeight: '600',
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    checkText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    // Wallpaper slideshow styles
    slideshowToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    slideshowLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 3,
    },
    slideshowSub: {
        fontSize: 13,
    },
    intervalSection: {
        marginTop: 10,
        marginBottom: 5,
    },
    wallpapersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    wallpaperSlideContainer: {
        position: 'relative',
    },
    wallpaperSlide: {
        width: 80,
        height: 120,
        borderRadius: 12,
        borderWidth: 2,
        overflow: 'hidden',
    },
    wallpaperImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    wallpaperActiveOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,153,51,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    wallpaperDeleteBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    wallpaperAddBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        gap: 6,
    },
    addSlideText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
