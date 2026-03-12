import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Switch, Share, ImageBackground, Platform, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent, GestureResponderEvent, Animated, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from '@react-native-community/blur';
import { libraryService } from '../../services/libraryService';
import { offlineBookService } from '../../services/offlineBookService';
import { ScriptureVerse, ChapterInfo } from '../../types/library';
import {
    Bookmark,
    Settings,
    Trash2,
    Star,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    X,
    MessageCircle,
    Share as ShareIcon,
    Sparkles
} from 'lucide-react-native';

import { useUser } from '../../context/UserContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import type { RootStackParamList } from '../../types/navigation';
import { handleAiBackNavigation } from '../../utils/aiNavigation';
declare var require: any;

type ReaderTheme = 'paper' | 'sepia' | 'dark' | 'ancient';
type ReaderRoute = RouteProp<RootStackParamList, 'Reader'>;

export const ReaderScreen = () => {
    const route = useRoute<ReaderRoute>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { isDarkMode, portalBackgroundType } = useSettings();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const { bookCode, title, chapter: initialChapterParam, verse: initialVerseParam, canto: initialCantoParam } = route.params;
    const initialChapter = typeof initialChapterParam === 'number' && initialChapterParam > 0 ? initialChapterParam : 1;
    const initialVerse = typeof initialVerseParam === 'string' && initialVerseParam.trim() ? initialVerseParam.trim() : null;
    const initialCanto = typeof initialCantoParam === 'number' && initialCantoParam >= 0 ? initialCantoParam : 0;

    const isPhotoBg = portalBackgroundType === 'image';

    const [chapters, setChapters] = useState<ChapterInfo[]>([]);
    const [currentChapter, setCurrentChapter] = useState<number>(initialChapter);
    const [currentCanto, setCurrentCanto] = useState<number>(initialCanto);
    const [verses, setVerses] = useState<ScriptureVerse[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [activeVerseIndex, setActiveVerseIndex] = useState(0);
    const [showChapterPicker, setShowChapterPicker] = useState(false);

    const mainScrollRef = useRef<ScrollView>(null);
    const verseSelectorRef = useRef<ScrollView>(null);
    const versePositions = useRef<{ [key: number]: number }>({});
    const lastReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveLastReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingBookmarkVerseRef = useRef<string | null>(null);
    const latestChaptersRequestRef = useRef(0);
    const latestVersesRequestRef = useRef(0);
    const isMountedRef = useRef(true);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Reader Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [showSanskrit, setShowSanskrit] = useState(true);
    const [showTransliteration, setShowTransliteration] = useState(true);
    const [showTranslation, setShowTranslation] = useState(true);
    const [showPurport, setShowPurport] = useState(true);
    const [fontSizeBase, setFontSizeBase] = useState(16);
    const [fontBold, setFontBold] = useState(false);
    const [isSerif, setIsSerif] = useState(true);
    const [readerTheme, setReaderTheme] = useState<ReaderTheme>('paper');

    // Bookmarks and History
    const [bookmarks, setBookmarks] = useState<string[]>([]); // Array of "bookCode-chapter-verse" strings
    const [showBookmarksList, setShowBookmarksList] = useState(false);

    const bookmarkKey = `bookmarks_${user?.ID || 'guest'}`;
    const lastReadKey = `last_read_${bookCode}_${user?.ID || 'guest'}`;

    const loadBookmarks = useCallback(async () => {
        try {
            const saved = await AsyncStorage.getItem(bookmarkKey);
            if (!saved || saved === 'undefined' || saved === 'null') {
                if (isMountedRef.current) {
                    setBookmarks([]);
                }
                return;
            }

            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                if (isMountedRef.current) {
                    setBookmarks(parsed.filter((item): item is string => typeof item === 'string'));
                }
            } else {
                if (isMountedRef.current) {
                    setBookmarks([]);
                }
            }
        } catch (e) { console.error(e); }
    }, [bookmarkKey]);

    const toggleBookmark = useCallback(async (v: Pick<ScriptureVerse, 'chapter' | 'verse'>) => {
        const id = `${bookCode}-${v.chapter}-${v.verse}`;
        let nextBookmarks: string[] = [];
        setBookmarks((prev) => {
            nextBookmarks = prev.includes(id)
                ? prev.filter((bookmarkId) => bookmarkId !== id)
                : [...prev, id];
            return nextBookmarks;
        });
        try {
            await AsyncStorage.setItem(bookmarkKey, JSON.stringify(nextBookmarks));
        } catch (error) {
            console.error('Failed to save bookmarks', error);
        }
    }, [bookCode, bookmarkKey]);

    const saveLastRead = async (index: number) => {
        if (verses[index]) {
            try {
                await AsyncStorage.setItem(lastReadKey, index.toString());
            } catch (error) {
                console.error('Failed to save last read', error);
            }
        }
    };

    const saveFontSettings = useCallback(async (size: number, bold: boolean) => {
        try {
            await AsyncStorage.setItem('reader_font_size', size.toString());
            await AsyncStorage.setItem('reader_font_bold', bold.toString());
        } catch (error) {
            console.error('Failed to save font settings', error);
        }
    }, []);

    const loadLastRead = useCallback(async () => {
        try {
            const saved = await AsyncStorage.getItem(lastReadKey);
            if (saved && verses.length > 0) {
                const index = parseInt(saved, 10);
                if (Number.isNaN(index) || index < 0 || index >= verses.length) {
                    return;
                }
                if (lastReadTimerRef.current) {
                    clearTimeout(lastReadTimerRef.current);
                }
                lastReadTimerRef.current = setTimeout(() => handleVersePress(index), 1000); // Small delay to ensure layout is ready
            }
        } catch (e) { console.error(e); }
    }, [lastReadKey, verses.length]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void saveFontSettings(fontSizeBase, fontBold);
        }, 200);

        return () => clearTimeout(timer);
    }, [fontBold, fontSizeBase]);

    useEffect(() => () => {
        isMountedRef.current = false;
        latestChaptersRequestRef.current += 1;
        latestVersesRequestRef.current += 1;
        if (lastReadTimerRef.current) {
            clearTimeout(lastReadTimerRef.current);
        }
        if (saveLastReadTimerRef.current) {
            clearTimeout(saveLastReadTimerRef.current);
        }
    }, []);

    useEffect(() => {
        loadBookmarks();
        loadLastRead();
    }, [loadBookmarks, loadLastRead]);

    useEffect(() => {
        if (initialVerse) {
            pendingBookmarkVerseRef.current = initialVerse;
        }
    }, [initialVerse]);

    useEffect(() => {
        setCurrentChapter(initialChapter);
        setCurrentCanto(initialCanto);
        setVerses([]);
        setActiveVerseIndex(0);
        versePositions.current = {};
    }, [initialChapter, initialCanto, bookCode]);

    const shareVerse = (v: ScriptureVerse) => {
        const textToShare = `${title}\n${t('reader.chapter')} ${v.chapter}, ${t('reader.text')} ${v.verse}\n\n${v.translation}\n\n${v.purport ? v.purport.substring(0, 300) + '...' : ''}`;
        Share.share({ message: textToShare });
    };

    useEffect(() => {
        if (verses.length > 0) {
            const verseWidth = 50; // Approximated width for center calculation
            const screenWidth = Dimensions.get('window').width;
            const scrollTo = activeVerseIndex * verseWidth - screenWidth / 2 + verseWidth / 2;
            verseSelectorRef.current?.scrollTo({ x: Math.max(0, scrollTo), animated: true });
        }
    }, [activeVerseIndex, verses.length]);

    // Default language logic: Use app language (i18n) as the source
    const getDefaultLanguage = (): 'ru' | 'en' => {
        // Use i18n.language which is set in AppSettings
        return i18n.language.startsWith('ru') ? 'ru' : 'en';
    };

    const [language, setLanguage] = useState<'ru' | 'en'>(getDefaultLanguage());
    const aiMeta = route.params;

    const readerVisual = useMemo(() => {
        if (readerTheme === 'sepia') {
            return {
                screenBg: '#EFE4CF',
                cardBg: '#F6EEDC',
                border: '#D6C2A2',
                textPrimary: '#3E2F1F',
                textSecondary: '#6E5A43',
                subtleActionBg: 'rgba(62, 47, 31, 0.06)',
                topBarBg: '#E6D8BE',
            };
        }
        if (readerTheme === 'paper') {
            return {
                screenBg: '#F8F1E2',
                cardBg: '#FFF9EC',
                border: '#D9CDB7',
                textPrimary: '#1F2937',
                textSecondary: '#5B6472',
                subtleActionBg: 'rgba(31, 41, 55, 0.06)',
                topBarBg: '#EEE5D4',
            };
        }
        if (readerTheme === 'ancient') {
            return {
                screenBg: '#E7D8B5',
                cardBg: 'rgba(255, 248, 229, 0.88)',
                border: '#C7AF79',
                textPrimary: '#322513',
                textSecondary: '#5D482A',
                subtleActionBg: 'rgba(50, 37, 19, 0.08)',
                topBarBg: 'rgba(231, 216, 181, 0.92)',
            };
        }
        return {
            screenBg: roleColors.background,
            cardBg: isPhotoBg ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 26, 38, 0.92)',
            border: isPhotoBg ? 'rgba(255, 255, 255, 0.22)' : roleColors.border,
            textPrimary: roleColors.textPrimary,
            textSecondary: roleColors.textSecondary,
            subtleActionBg: 'rgba(255,255,255,0.08)',
            topBarBg: isPhotoBg ? 'rgba(15, 23, 42, 0.62)' : 'rgba(15, 23, 42, 0.95)',
        };
    }, [readerTheme, roleColors, isPhotoBg]);

    const glassSurface = readerVisual.cardBg;
    const glassBorder = readerVisual.border;
    const accentColor = roleColors.accent;

    const normalizeVerse = useCallback((raw: any): ScriptureVerse => {
        const pick = (...values: any[]): string => {
            for (const value of values) {
                if (typeof value === 'string' && value.trim().length > 0) return value;
            }
            return '';
        };

        return {
            id: Number(raw?.id || 0),
            book_code: String(raw?.book_code || raw?.bookCode || bookCode),
            canto: Number(raw?.canto || 0),
            chapter: Number(raw?.chapter || currentChapter),
            verse: String(raw?.verse || raw?.number || ''),
            language: String(raw?.language || language),
            devanagari: pick(raw?.devanagari, raw?.text_sanskrit),
            transliteration: pick(raw?.transliteration, raw?.translit),
            synonyms: String(raw?.synonyms || ''),
            translation: pick(raw?.translation, raw?.translation_ru, raw?.translation_en, raw?.text),
            purport: pick(raw?.purport, raw?.purport_ru, raw?.purport_en, raw?.commentary),
            source_url: String(raw?.source_url || ''),
            verse_reference: String(raw?.verse_reference || ''),
            created_at: String(raw?.created_at || ''),
            updated_at: String(raw?.updated_at || ''),
        };
    }, [bookCode, currentChapter, language]);

    // Update language when app language changes in settings
    useEffect(() => {
        const newLang = i18n.language.startsWith('ru') ? 'ru' : 'en';
        if (newLang !== language) {
            setLanguage(newLang);
        }
    }, [i18n.language, language]);

    const toggleLanguage = useCallback(() => {
        const newLang = language === 'ru' ? 'en' : 'ru';
        setLanguage(newLang);
    }, [language]);

    const loadChapters = useCallback(async () => {
        const requestId = ++latestChaptersRequestRef.current;
        try {
            const data = await libraryService.getChapters(bookCode);
            if (requestId === latestChaptersRequestRef.current && isMountedRef.current) {
                setChapters(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to load chapters from network, trying offline', error);
            // Fallback to offline data
            const offlineData = await offlineBookService.getOfflineChapters(bookCode);
            if (requestId !== latestChaptersRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (offlineData.length > 0) {
                setChapters(offlineData);
            } else {
                setChapters([]);
            }
        }
    }, [bookCode]);

    const loadVerses = useCallback(async (chapter: number, canto: number = 0) => {
        const requestId = ++latestVersesRequestRef.current;
        if (isMountedRef.current) {
            setLoading(true);
            setLoadError(null);
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
        try {
            const primaryData = await libraryService.getVerses(bookCode, chapter, canto || undefined, language);
            let normalized = (Array.isArray(primaryData) ? primaryData : []).map(normalizeVerse);

            // Fallback chain for inconsistent `language` column in legacy data.
            if (normalized.length === 0) {
                const fallbackLang = language === 'ru' ? 'en' : 'ru';
                const fallbackLangData = await libraryService.getVerses(bookCode, chapter, canto || undefined, fallbackLang);
                normalized = (Array.isArray(fallbackLangData) ? fallbackLangData : []).map(normalizeVerse);
            }
            if (normalized.length === 0) {
                const noLangData = await libraryService.getVerses(bookCode, chapter, canto || undefined);
                normalized = (Array.isArray(noLangData) ? noLangData : []).map(normalizeVerse);
            }

            if (requestId === latestVersesRequestRef.current && isMountedRef.current) {
                setVerses(normalized);
                setCurrentChapter(chapter);
                setCurrentCanto(canto);
                setActiveVerseIndex(0);
                versePositions.current = {};
                mainScrollRef.current?.scrollTo({ y: 0, animated: false });
                if (normalized.length === 0) {
                    setLoadError(t('reader.empty_chapter', 'There is no text in this chapter yet, or it has not been loaded.'));
                }
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            }
        } catch (error) {
            console.error('Failed to load verses from network, trying offline', error);
            const offlineData = await offlineBookService.getOfflineVerses(bookCode, chapter, canto, language);
            if (requestId !== latestVersesRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (offlineData.length > 0) {
                setVerses(offlineData.map(normalizeVerse));
                setCurrentChapter(chapter);
                setCurrentCanto(canto);
                setActiveVerseIndex(0);
                versePositions.current = {};
                mainScrollRef.current?.scrollTo({ y: 0, animated: false });
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            } else {
                setVerses([]);
                setLoadError(t('reader.load_error', 'Failed to load the chapter text. Check your internet and try again.'));
            }
        } finally {
            if (requestId === latestVersesRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [bookCode, language, fadeAnim, normalizeVerse, t]);

    useEffect(() => {
        loadChapters();
    }, [loadChapters]);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: title,
            headerLeft: aiMeta?.origin === 'ai_chat'
                ? () => (
                    <TouchableOpacity
                        onPress={() => handleAiBackNavigation(navigation as any, aiMeta)}
                        style={[styles.headerIconBtn, { backgroundColor: glassSurface, borderColor: glassBorder }]}
                    >
                        <ArrowLeft size={18} color={readerVisual.textPrimary} />
                    </TouchableOpacity>
                )
                : undefined,
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                        onPress={() => setShowBookmarksList(true)}
                        style={[styles.headerIconBtn, { backgroundColor: glassSurface, borderColor: glassBorder }]}
                    >
                        <Bookmark size={20} color={readerVisual.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        style={[styles.headerIconBtn, { backgroundColor: glassSurface, borderColor: glassBorder }]}
                    >
                        <Settings size={20} color={readerVisual.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={toggleLanguage}
                        style={[styles.headerLangBtn, { backgroundColor: glassSurface, borderColor: glassBorder }]}
                    >
                        <Text style={[styles.langText, { color: accentColor }]}>
                            {language === 'ru' ? 'RU' : 'EN'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ),
            headerStyle: {
                backgroundColor: readerVisual.topBarBg,
                elevation: 0,
                shadowOpacity: 0,
            },
            headerBackTitleVisible: false,
            headerTitleAlign: 'center',
            headerTintColor: readerVisual.textPrimary,
            headerTitleStyle: {
                color: readerVisual.textPrimary,
                fontSize: 19,
                fontWeight: '800',
            },
        });
    }, [aiMeta, language, navigation, title, toggleLanguage, glassSurface, glassBorder, accentColor, readerVisual]);

    useFocusEffect(
        useCallback(() => {
            if (aiMeta?.origin !== 'ai_chat') {
                return undefined;
            }
            const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
                handleAiBackNavigation(navigation as any, aiMeta);
                return true;
            });
            return () => subscription.remove();
        }, [aiMeta, navigation]),
    );

    useEffect(() => {
        if (chapters.length === 0) {
            return;
        }

        const hasCurrentChapter = chapters.some(
            (chapter) => chapter.chapter === currentChapter && (chapter.canto || 0) === currentCanto
        );

        if (!hasCurrentChapter) {
            const firstChapter = chapters[0];
            loadVerses(firstChapter.chapter, firstChapter.canto || 0);
            return;
        }

        if (verses.length === 0) {
            loadVerses(currentChapter, currentCanto);
        }
    }, [chapters, currentChapter, currentCanto, verses.length, loadVerses]);

    const handleVersePress = (index: number) => {
        if (index < 0 || index >= verses.length) {
            return;
        }
        setActiveVerseIndex(index);
        const yOffset = versePositions.current[index];
        if (yOffset !== undefined) {
            mainScrollRef.current?.scrollTo({ y: yOffset - 10, animated: true });
        }
    };

    useEffect(() => {
        const pendingVerse = pendingBookmarkVerseRef.current;
        if (!pendingVerse || verses.length === 0) {
            return;
        }

        const verseIndex = verses.findIndex((verse) => String(verse.verse) === pendingVerse);
        if (verseIndex >= 0) {
            handleVersePress(verseIndex);
        }
        pendingBookmarkVerseRef.current = null;
    }, [verses]);

    const onVerseLayout = (index: number, y: number) => {
        versePositions.current[index] = y;
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        // Find which verse we are currently viewing
        const indices = Object.keys(versePositions.current).map(Number).sort((a, b) => a - b);
        let currentIndex = 0;
        for (let i = 0; i < indices.length; i++) {
            if (y >= versePositions.current[indices[i]] - 50) {
                currentIndex = indices[i];
            } else {
                break;
            }
        }
        if (currentIndex !== activeVerseIndex) {
            setActiveVerseIndex(currentIndex);
            if (saveLastReadTimerRef.current) {
                clearTimeout(saveLastReadTimerRef.current);
            }
            saveLastReadTimerRef.current = setTimeout(() => {
                saveLastRead(currentIndex);
            }, 350);
        }
    };

    const goToPreviousChapter = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter && (ch.canto || 0) === currentCanto);
        if (currentIndex > 0) {
            const prev = chapters[currentIndex - 1];
            loadVerses(prev.chapter, prev.canto);
        }
    };

    const goToNextChapter = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter && (ch.canto || 0) === currentCanto);
        if (currentIndex < chapters.length - 1) {
            const next = chapters[currentIndex + 1];
            loadVerses(next.chapter, next.canto);
        }
    };

    const canGoPrevious = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter && (ch.canto || 0) === currentCanto);
        return currentIndex > 0;
    };

    const canGoNext = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter && (ch.canto || 0) === currentCanto);
        return currentIndex < chapters.length - 1;
    };

    const renderWithTheme = () => {
        const bgSource = readerTheme === 'ancient' ? require('../../assets/ancient_parchment.png') : null;

        return (
            <View style={[styles.container, { backgroundColor: readerVisual.screenBg }]}>
                {bgSource ? (
                    <ImageBackground
                        source={bgSource}
                        style={styles.container}
                        imageStyle={{ opacity: 0.9 }}
                    >
                        {content}
                    </ImageBackground>
                ) : (
                    <View style={[styles.container, { backgroundColor: readerVisual.screenBg }]}>
                        {content}
                    </View>
                )}
            </View>
        );
    };

    const content = (
        <>
            <Modal
                transparent={true}
                visible={showSettings}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowSettings(false)} />
                    <View style={[styles.settingsContainer, { backgroundColor: roleColors.background, borderColor: roleColors.border }]}>
                        {isPhotoBg && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType={isDarkMode ? 'dark' : 'light'}
                                blurAmount={20}
                                reducedTransparencyFallbackColor={roleColors.surfaceElevated}
                            />
                        )}
                        <View style={styles.settingsHeader}>
                            <Text style={[styles.settingsTitle, { color: roleColors.textPrimary }]}>{t('reader.settings', 'Reading settings')}</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)} style={[styles.closeBtn, { backgroundColor: glassSurface }]}>
                                <X size={20} color={roleColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.settingsScroll} showsVerticalScrollIndicator={false}>
                            <View style={[styles.glassSettingCard, { backgroundColor: glassSurface, borderColor: glassBorder }]}>
                                <View style={styles.settingRow}>
                                    <Text style={[styles.settingLabel, { color: roleColors.textPrimary }]}>{t('reader.show_sanskrit', 'Sanskrit')}</Text>
                                    <Switch value={showSanskrit} onValueChange={setShowSanskrit} trackColor={{ true: accentColor }} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={[styles.settingLabel, { color: roleColors.textPrimary }]}>{t('reader.show_translit', 'Transliteration')}</Text>
                                    <Switch value={showTransliteration} onValueChange={setShowTransliteration} trackColor={{ true: accentColor }} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={[styles.settingLabel, { color: roleColors.textPrimary }]}>{t('reader.show_translation', 'Translation')}</Text>
                                    <Switch value={showTranslation} onValueChange={setShowTranslation} trackColor={{ true: accentColor }} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={[styles.settingLabel, { color: roleColors.textPrimary }]}>{t('reader.show_purport', 'Purport')}</Text>
                                    <Switch value={showPurport} onValueChange={setShowPurport} trackColor={{ true: accentColor }} />
                                </View>
                            </View>

                            <Text style={[styles.sectionLabel, { color: roleColors.textSecondary }]}>{t('reader.font_size', 'Font size')}</Text>
                            <View style={[styles.glassSettingCard, { backgroundColor: glassSurface, borderColor: glassBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }]}>
                                <TouchableOpacity onPress={() => setFontSizeBase(prev => Math.max(12, prev - 2))} style={[styles.fontBtn, { backgroundColor: glassSurface, borderColor: glassBorder }]}>
                                    <Text style={[styles.fontBtnText, { color: accentColor }]}>A-</Text>
                                </TouchableOpacity>
                                <Text style={[styles.fontSizeValue, { color: roleColors.textPrimary }]}>{fontSizeBase}</Text>
                                <TouchableOpacity onPress={() => setFontSizeBase(prev => Math.min(30, prev + 2))} style={[styles.fontBtn, { backgroundColor: glassSurface, borderColor: glassBorder }]}>
                                    <Text style={[styles.fontBtnText, { color: accentColor }]}>A+</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.glassSettingCard, { backgroundColor: glassSurface, borderColor: glassBorder, marginTop: 15 }]}>
                                <View style={styles.settingRow}>
                                    <Text style={[styles.settingLabel, { color: roleColors.textPrimary }]}>{t('reader.font_bold', 'Bold font')}</Text>
                                    <Switch value={fontBold} onValueChange={setFontBold} trackColor={{ true: accentColor }} />
                                </View>
                                <View style={styles.settingRow}>
                                    <Text style={[styles.settingLabel, { color: roleColors.textPrimary }]}>{t('reader.font_serif', 'Serif')}</Text>
                                    <Switch value={isSerif} onValueChange={setIsSerif} trackColor={{ true: accentColor }} />
                                </View>
                            </View>

                            <Text style={[styles.sectionLabel, { color: roleColors.textSecondary }]}>{t('reader.theme', 'Theme')}</Text>
                            <View style={styles.themeSelector}>
                                {(['paper', 'sepia', 'ancient', 'dark'] as ReaderTheme[]).map((tName) => (
                                    <TouchableOpacity
                                        key={tName}
                                        style={[
                                            styles.themeBtn,
                                            { backgroundColor: tName === 'paper' ? '#FFF8E1' : tName === 'sepia' ? '#F4ECD8' : tName === 'ancient' ? '#F1E5AC' : '#1A1A1A' },
                                            readerTheme === tName && { borderColor: accentColor, borderWidth: 2 }
                                        ]}
                                        onPress={() => setReaderTheme(tName)}
                                    >
                                        <Text style={[styles.themeBtnText, { color: tName === 'dark' ? '#FFF' : '#333' }]}>
                                            {t(`reader.theme_${tName}`, tName)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent={true}
                visible={showBookmarksList}
                animationType="fade"
                onRequestClose={() => setShowBookmarksList(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowBookmarksList(false)} />
                    <View style={[styles.bookmarksContainer, { backgroundColor: roleColors.background, borderColor: roleColors.border }]}>
                        {isPhotoBg && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType={isDarkMode ? 'dark' : 'light'}
                                blurAmount={20}
                            />
                        )}
                        <View style={styles.settingsHeader}>
                            <Text style={[styles.settingsTitle, { color: roleColors.textPrimary }]}>{t('reader.bookmarks', 'Your bookmarks')}</Text>
                            <TouchableOpacity onPress={() => setShowBookmarksList(false)} style={[styles.closeBtn, { backgroundColor: glassSurface }]}>
                                <X size={20} color={roleColors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {bookmarks.length === 0 ? (
                                <View style={styles.emptyWrap}>
                                    <Bookmark size={48} color={roleColors.textSecondary} style={{ opacity: 0.3, marginBottom: 15 }} />
                                    <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>{t('reader.no_bookmarks', 'No bookmarks yet')}</Text>
                                </View>
                            ) : (
                                bookmarks.map((bId) => {
                                    const [bCode, ch, v] = bId.split('-');
                                    if (bCode !== bookCode) return null;
                                    return (
                                        <TouchableOpacity
                                            key={bId}
                                            style={[styles.bookmarkItem, { backgroundColor: glassSurface, borderColor: glassBorder }]}
                                            onPress={async () => {
                                                const targetChapter = parseInt(ch, 10);
                                                if (Number.isNaN(targetChapter)) return;
                                                if (targetChapter !== currentChapter) {
                                                    const targetChapterMeta = chapters.find((chapter) => chapter.chapter === targetChapter);
                                                    pendingBookmarkVerseRef.current = v;
                                                    await loadVerses(targetChapter, targetChapterMeta?.canto || 0);
                                                } else {
                                                    const vIndex = verses.findIndex(ver => String(ver.verse) === v);
                                                    if (vIndex !== -1) handleVersePress(vIndex);
                                                }
                                                setShowBookmarksList(false);
                                            }}
                                        >
                                            <View style={styles.bookmarkInfo}>
                                                <Sparkles size={14} color={accentColor} style={{ marginRight: 8 }} />
                                                <Text style={[styles.bookmarkText, { color: roleColors.textPrimary }]}>
                                                    {t('reader.chapter')} {ch}, {t('reader.text')} {v}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={(event: GestureResponderEvent) => {
                                                    event.stopPropagation();
                                                    const targetChapter = parseInt(ch, 10);
                                                    if (!Number.isNaN(targetChapter)) void toggleBookmark({ chapter: targetChapter, verse: v });
                                                }}
                                                style={[styles.bookmarkTrash, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                            >
                                                <Trash2 size={16} color={roleColors.danger} />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    )
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <View style={[styles.navigationHeader, { backgroundColor: readerVisual.topBarBg }]}>
                <View style={styles.chapterSelector}>
                    <TouchableOpacity
                        onPress={goToPreviousChapter}
                        disabled={!canGoPrevious()}
                        style={[styles.navButton, { backgroundColor: glassSurface, borderColor: glassBorder }, !canGoPrevious() && styles.navButtonDisabled]}
                    >
                        <ChevronLeft size={20} color={readerVisual.textPrimary} />
                    </TouchableOpacity>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chapterScroll} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 10 }}>
                        {chapters.map((ch) => {
                            const isActive = currentChapter === ch.chapter && (ch.canto || 0) === currentCanto;
                            return (
                                <TouchableOpacity
                                    key={`${ch.canto}-${ch.chapter}`}
                                    style={[
                                        styles.chapterBtn,
                                        { backgroundColor: isActive ? accentColor : glassSurface, borderColor: isActive ? accentColor : glassBorder }
                                    ]}
                                    onPress={() => loadVerses(ch.chapter, ch.canto)}
                                >
                                    <Text style={[styles.chapterText, { color: isActive ? '#FFF' : readerVisual.textPrimary }]}>
                                        {ch.chapter}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity
                        onPress={() => setShowChapterPicker(true)}
                        style={[styles.chapterListBtn, { backgroundColor: glassSurface, borderColor: glassBorder }]}
                        accessibilityLabel={t('reader.choose_chapter', 'Choose chapter')}
                    >
                        <Text style={[styles.chapterListBtnText, { color: readerVisual.textPrimary }]}>#</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={goToNextChapter}
                        disabled={!canGoNext()}
                        style={[styles.navButton, { backgroundColor: glassSurface, borderColor: glassBorder }, !canGoNext() && styles.navButtonDisabled]}
                    >
                        <ChevronRight size={20} color={readerVisual.textPrimary} />
                    </TouchableOpacity>
                </View>
                {chapters.length > 0 && (
                    <Text style={[styles.currentChapterTitle, { color: readerVisual.textSecondary }]}>
                        {chapters.find((ch) => ch.chapter === currentChapter && (ch.canto || 0) === currentCanto)?.chapter_title || ''}
                    </Text>
                )}

                {verses.length > 0 && (
                    <View style={styles.verseSelector}>
                        <ScrollView
                            ref={verseSelectorRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.verseScroll}
                            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
                        >
                            {verses.map((v, index) => {
                                const isActive = activeVerseIndex === index;
                                return (
                                    <TouchableOpacity
                                        key={`selector-${v.id || `${v.chapter}-${v.verse}-${index}`}`}
                                        style={[
                                            styles.verseBtn,
                                            { backgroundColor: isActive ? accentColor : glassSurface, borderColor: isActive ? accentColor : glassBorder }
                                        ]}
                                        onPress={() => handleVersePress(index)}
                                    >
                                        <Text style={[styles.verseBtnText, { color: isActive ? '#FFF' : readerVisual.textPrimary }]}>
                                            {v.verse}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                    <Text style={[styles.loadingText, { color: readerVisual.textSecondary }]}>{t('common.loading', 'Loading...')}</Text>
                </View>
            ) : (
                <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                    <ScrollView
                        ref={mainScrollRef}
                        contentContainerStyle={styles.textContainer}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                    >
                        {verses.map((v, index) => {
                            const isBookmarked = bookmarks.includes(`${bookCode}-${v.chapter}-${v.verse}`);
                            return (
                                <View
                                    key={v.id || `${v.chapter}-${v.verse}-${index}`}
                                    style={[styles.verseContainer, { backgroundColor: glassSurface, borderColor: glassBorder }]}
                                    onLayout={(event: LayoutChangeEvent) => onVerseLayout(index, event.nativeEvent.layout.y)}
                                >
                                    <View style={styles.verseHeader}>
                                        <View style={[styles.verseBadge, { backgroundColor: accentColor }]}>
                                            <Text style={styles.verseBadgeText}>{t('reader.text')} {v.verse}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => { }}
                                                style={[styles.verseActionBtn, { backgroundColor: readerVisual.subtleActionBg }]}
                                            >
                                                <MessageCircle size={18} color={readerVisual.textSecondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => toggleBookmark(v)}
                                                style={[styles.verseActionBtn, { backgroundColor: isBookmarked ? accentColor + '20' : readerVisual.subtleActionBg }]}
                                            >
                                                <Star
                                                    size={18}
                                                    color={isBookmarked ? accentColor : readerVisual.textSecondary}
                                                    fill={isBookmarked ? accentColor : 'transparent'}
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => shareVerse(v)}
                                                style={[styles.verseActionBtn, { backgroundColor: readerVisual.subtleActionBg }]}
                                            >
                                                <ShareIcon size={18} color={readerVisual.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {v.devanagari && showSanskrit && (
                                        <Text style={[
                                            styles.sanskrit,
                                            { fontSize: fontSizeBase + 4, fontWeight: fontBold ? 'bold' : 'normal', color: readerVisual.textPrimary }
                                        ]}>
                                            {v.devanagari}
                                        </Text>
                                    )}
                                    {showTransliteration && !!v.transliteration && (
                                        <Text style={[
                                            styles.transliteration,
                                            { fontSize: fontSizeBase, fontWeight: fontBold ? 'bold' : 'normal', color: readerVisual.textSecondary }
                                        ]}>
                                            {v.transliteration}
                                        </Text>
                                    )}
                                    {showTranslation && !!v.translation && (
                                        <Text style={[
                                            styles.translation,
                                            { fontSize: fontSizeBase + 2, fontWeight: fontBold ? 'bold' : '700', color: readerVisual.textPrimary }
                                        ]}>
                                            {v.translation}
                                        </Text>
                                    )}
                                    {v.purport && showPurport && (
                                        <View style={[styles.purportGlassBox, { backgroundColor: readerVisual.subtleActionBg, borderColor: glassBorder }]}>
                                            <Text style={[
                                                styles.purport,
                                                {
                                                    fontSize: fontSizeBase,
                                                    fontWeight: fontBold ? 'bold' : '400',
                                                    fontFamily: isSerif ? (Platform.OS === 'ios' ? 'Georgia' : 'serif') : undefined,
                                                    color: readerVisual.textSecondary
                                                }
                                            ]}>
                                                {v.purport}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        {verses.length === 0 && (
                            <View style={[styles.emptyChapterCard, { backgroundColor: glassSurface, borderColor: glassBorder }]}>
                                <Text style={[styles.emptyChapterTitle, { color: readerVisual.textPrimary }]}>
                                    {t('reader.no_verses_title', 'Chapter text not found')}
                                </Text>
                                <Text style={[styles.emptyChapterText, { color: readerVisual.textSecondary }]}>
                                    {loadError || t('reader.no_verses_hint', 'Try another chapter or refresh the loading.')}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.emptyChapterButton, { backgroundColor: accentColor }]}
                                    onPress={() => loadVerses(currentChapter, currentCanto)}
                                >
                                    <Text style={styles.emptyChapterButtonText}>{t('common.retry', 'Retry')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.footerNav}>
                            <TouchableOpacity
                                onPress={goToPreviousChapter}
                                disabled={!canGoPrevious()}
                                style={[styles.footerBtn, { backgroundColor: glassSurface, borderColor: glassBorder }, !canGoPrevious() && styles.footerBtnDisabled]}
                            >
                                <ArrowLeft size={18} color={canGoPrevious() ? readerVisual.textPrimary : readerVisual.textSecondary} />
                                <Text style={[styles.footerBtnText, { color: canGoPrevious() ? readerVisual.textPrimary : readerVisual.textSecondary }]}>
                                    {t('reader.prev', 'Back')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={goToNextChapter}
                                disabled={!canGoNext()}
                                style={[styles.footerBtn, { backgroundColor: accentColor, borderColor: accentColor }, !canGoNext() && styles.footerBtnDisabled]}
                            >
                                <Text style={[styles.footerBtnText, { color: '#FFF' }]}>
                                    {t('reader.next', 'Next')}
                                </Text>
                                <ArrowRight size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            )}

            <Modal
                transparent={true}
                visible={showChapterPicker}
                animationType="fade"
                onRequestClose={() => setShowChapterPicker(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowChapterPicker(false)} />
                    <View style={[styles.chapterPickerContainer, { backgroundColor: roleColors.background, borderColor: roleColors.border }]}>
                        <Text style={[styles.chapterPickerTitle, { color: readerVisual.textPrimary }]}>
                            {t('reader.choose_chapter', 'Choose chapter')}
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.chapterPickerGrid}>
                                {chapters.map((ch) => {
                                    const active = currentChapter === ch.chapter && (ch.canto || 0) === currentCanto;
                                    return (
                                        <TouchableOpacity
                                            key={`picker-${ch.canto}-${ch.chapter}`}
                                            style={[
                                                styles.chapterPickerItem,
                                                { backgroundColor: active ? accentColor : glassSurface, borderColor: active ? accentColor : glassBorder }
                                            ]}
                                            onPress={() => {
                                                setShowChapterPicker(false);
                                                loadVerses(ch.chapter, ch.canto || 0);
                                            }}
                                        >
                                            <Text style={[styles.chapterPickerItemNumber, { color: active ? '#FFF' : readerVisual.textPrimary }]}>
                                                {ch.chapter}
                                            </Text>
                                            {!!ch.chapter_title && (
                                                <Text style={[styles.chapterPickerItemTitle, { color: active ? 'rgba(255,255,255,0.9)' : readerVisual.textSecondary }]} numberOfLines={2}>
                                                    {ch.chapter_title}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );

    return renderWithTheme();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Navigation Header (Chapter/Verse Selector)
    navigationHeader: {
        borderBottomWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
        overflow: 'hidden',
        paddingTop: 4,
    },
    chapterSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    chapterScroll: {
        flex: 1,
        marginHorizontal: 6,
    },
    chapterBtn: {
        minWidth: 40,
        height: 40,
        borderRadius: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        paddingHorizontal: 12,
    },
    chapterText: {
        fontSize: 16,
        fontWeight: '700',
    },
    chapterListBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    chapterListBtnText: {
        fontSize: 15,
        fontWeight: '800',
    },
    currentChapterTitle: {
        fontSize: 12,
        lineHeight: 16,
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 2,
    },
    verseSelector: {
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.10)',
    },
    verseScroll: {
        maxHeight: 40,
    },
    verseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    verseBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Header Custom Title
    headerTitleWrap: {
        alignItems: 'center',
    },
    headerTitleText: {
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitleText: {
        fontSize: 11,
        opacity: 0.8,
    },
    headerIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLangBtn: {
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 17,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    langText: {
        fontSize: 12,
        fontWeight: '800',
    },

    // Content
    textContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
    },
    emptyChapterCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyChapterTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyChapterText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyChapterButton: {
        marginTop: 14,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    emptyChapterButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    verseContainer: {
        marginBottom: 24,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    verseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    verseBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verseBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    verseActionBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sanskrit: {
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 32,
    },
    transliteration: {
        textAlign: 'center',
        marginBottom: 16,
        fontStyle: 'italic',
        lineHeight: 24,
    },
    translation: {
        textAlign: 'left',
        marginBottom: 16,
        lineHeight: 26,
    },
    purportGlassBox: {
        marginTop: 10,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    purport: {
        lineHeight: 24,
        textAlign: 'left',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    settingsContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '85%',
        borderTopWidth: 1,
        overflow: 'hidden',
    },
    bookmarksContainer: {
        position: 'absolute',
        top: '10%',
        bottom: '10%',
        left: 20,
        right: 20,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    chapterPickerContainer: {
        width: '90%',
        maxHeight: '78%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
    },
    chapterPickerTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
    },
    chapterPickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        paddingBottom: 10,
    },
    chapterPickerItem: {
        width: '48%',
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    chapterPickerItemNumber: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    chapterPickerItemTitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    settingsTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsScroll: {
        marginBottom: 20,
    },
    glassSettingCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    fontBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fontBtnText: {
        fontSize: 18,
        fontWeight: '700',
    },
    fontSizeValue: {
        fontSize: 20,
        fontWeight: '800',
        marginHorizontal: 24,
    },
    themeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    themeBtn: {
        flex: 1,
        minWidth: '45%',
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    themeBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    bookmarkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
    },
    bookmarkInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookmarkText: {
        fontSize: 15,
        fontWeight: '600',
    },
    bookmarkTrash: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
    },

    // Themes
    paper: { backgroundColor: '#FFF8E1' },
    sepia: { backgroundColor: '#F4ECD8' },
    dark: { backgroundColor: '#121212' },
    ancient: { backgroundColor: 'transparent' },

    // Footer
    footerNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 40,
    },
    footerBtn: {
        flex: 0.48,
        height: 54,
        borderRadius: 27,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        gap: 8,
    },
    footerBtnDisabled: {
        opacity: 0.3,
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
