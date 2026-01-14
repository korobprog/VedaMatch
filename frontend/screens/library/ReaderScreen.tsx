import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Switch, Share, Alert, ImageBackground, Platform, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';
import { libraryService } from '../../services/libraryService';
import { ScriptureVerse, ChapterInfo } from '../../types/library';
import {
    Bookmark,
    Settings,
    Trash2,
    Share2,
    Star,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    X
} from 'lucide-react-native';

import { useUser } from '../../context/UserContext';
import { useTranslation } from 'react-i18next';
declare var require: any;

export const ReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { bookCode, title } = route.params;
    const [chapters, setChapters] = useState<ChapterInfo[]>([]);
    const [currentChapter, setCurrentChapter] = useState<number>(1);
    const [verses, setVerses] = useState<ScriptureVerse[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeVerseIndex, setActiveVerseIndex] = useState(0);

    const mainScrollRef = useRef<ScrollView>(null);
    const verseSelectorRef = useRef<ScrollView>(null);
    const versePositions = useRef<{ [key: number]: number }>({});

    // Reader Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [showSanskrit, setShowSanskrit] = useState(true);
    const [showTransliteration, setShowTransliteration] = useState(true);
    const [showTranslation, setShowTranslation] = useState(true);
    const [showPurport, setShowPurport] = useState(true);
    const [fontSizeBase, setFontSizeBase] = useState(16);
    const [fontBold, setFontBold] = useState(false);
    const [isSerif, setIsSerif] = useState(true);
    const [readerTheme, setReaderTheme] = useState<'paper' | 'sepia' | 'dark' | 'ancient'>('paper');

    // Bookmarks and History
    const [bookmarks, setBookmarks] = useState<string[]>([]); // Array of "bookCode-chapter-verse" strings
    const [showBookmarksList, setShowBookmarksList] = useState(false);

    const bookmarkKey = `bookmarks_${user?.ID || 'guest'}`;
    const lastReadKey = `last_read_${bookCode}_${user?.ID || 'guest'}`;

    useEffect(() => {
        loadBookmarks();
        loadLastRead();
    }, []);

    const loadBookmarks = async () => {
        try {
            const saved = await AsyncStorage.getItem(bookmarkKey);
            if (saved && saved !== 'undefined' && saved !== 'null') setBookmarks(JSON.parse(saved));
        } catch (e) { console.error(e); }
    };

    const toggleBookmark = async (v: ScriptureVerse) => {
        const id = `${bookCode}-${v.chapter}-${v.verse}`;
        let newBookmarks;
        if (bookmarks.includes(id)) {
            newBookmarks = bookmarks.filter(b => b !== id);
        } else {
            newBookmarks = [...bookmarks, id];
        }
        setBookmarks(newBookmarks);
        await AsyncStorage.setItem(bookmarkKey, JSON.stringify(newBookmarks));
    };

    const saveLastRead = async (index: number) => {
        if (verses[index]) {
            await AsyncStorage.setItem(lastReadKey, index.toString());
        }
    };

    const loadLastRead = async () => {
        try {
            const saved = await AsyncStorage.getItem(lastReadKey);
            if (saved && verses.length > 0) {
                const index = parseInt(saved);
                setTimeout(() => handleVersePress(index), 1000); // Small delay to ensure layout is ready
            }
        } catch (e) { console.error(e); }
    };

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

    // Default language logic: User Profile -> App Language -> English
    const getDefaultLanguage = () => {
        if (user?.language) {
            return user.language === 'ru' ? 'ru' : 'en';
        }
        return i18n.language.startsWith('ru') ? 'ru' : 'en';
    };

    const [language, setLanguage] = useState<'ru' | 'en'>(getDefaultLanguage());

    useEffect(() => {
        loadChapters();
    }, []);

    useEffect(() => {
        navigation.setOptions({
            title: title,
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowBookmarksList(true)} style={{ padding: 8 }}>
                        <Bookmark size={22} color={ModernVedicTheme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
                        <Settings size={22} color={ModernVedicTheme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleLanguage} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FF8000' }}>
                            {language === 'ru' ? 'RU' : 'EN'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [language, bookmarks.length]);

    useEffect(() => {
        loadVerses(currentChapter);
    }, [language, currentChapter]);

    const toggleLanguage = () => {
        const newLang = language === 'ru' ? 'en' : 'ru';
        console.log('Toggling language from', language, 'to', newLang);
        setLanguage(newLang);
    };

    const loadChapters = async () => {
        try {
            const data = await libraryService.getChapters(bookCode);
            setChapters(data);
        } catch (error) {
            console.error('Failed to load chapters', error);
        }
    };

    const loadVerses = async (chapter: number) => {
        setLoading(true);
        console.log('Loading verses for chapter', chapter, 'in language', language);
        try {
            const data = await libraryService.getVerses(bookCode, chapter, undefined, language);
            console.log('Loaded', data.length, 'verses');
            setVerses(data);
            setCurrentChapter(chapter);
            setActiveVerseIndex(0);
            versePositions.current = {};
            // Scroll to top when chapter changes
            mainScrollRef.current?.scrollTo({ y: 0, animated: false });
        } catch (error) {
            console.error('Failed to load verses', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVersePress = (index: number) => {
        setActiveVerseIndex(index);
        const yOffset = versePositions.current[index];
        if (yOffset !== undefined) {
            mainScrollRef.current?.scrollTo({ y: yOffset - 10, animated: true });
        }
    };

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
            saveLastRead(currentIndex);
        }
    };

    const goToPreviousChapter = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter);
        if (currentIndex > 0) {
            loadVerses(chapters[currentIndex - 1].chapter);
        }
    };

    const goToNextChapter = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter);
        if (currentIndex < chapters.length - 1) {
            loadVerses(chapters[currentIndex + 1].chapter);
        }
    };

    const canGoPrevious = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter);
        return currentIndex > 0;
    };

    const canGoNext = () => {
        const currentIndex = chapters.findIndex(ch => ch.chapter === currentChapter);
        return currentIndex < chapters.length - 1;
    };

    const renderWithTheme = () => {
        if (readerTheme === 'ancient') {
            return (
                <ImageBackground
                    source={require('../../assets/ancient_parchment.png')}
                    style={styles.container}
                    imageStyle={{ opacity: 0.9 }}
                >
                    {content}
                </ImageBackground>
            );
        }

        return (
            <View style={[styles.container, styles[readerTheme]]}>
                {content}
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
                    <View style={styles.settingsContainer}>
                        <View style={styles.settingsHeader}>
                            <Text style={styles.settingsTitle}>{t('reader.settings', 'Настройки чтения')}</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeBtn}>
                                <X size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.settingsScroll}>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('reader.show_sanskrit', 'Санскрит')}</Text>
                                <Switch value={showSanskrit} onValueChange={setShowSanskrit} trackColor={{ true: '#FF8000' }} />
                            </View>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('reader.show_translit', 'Транслитерация')}</Text>
                                <Switch value={showTransliteration} onValueChange={setShowTransliteration} trackColor={{ true: '#FF8000' }} />
                            </View>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('reader.show_translation', 'Перевод')}</Text>
                                <Switch value={showTranslation} onValueChange={setShowTranslation} trackColor={{ true: '#FF8000' }} />
                            </View>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('reader.show_purport', 'Комментарий')}</Text>
                                <Switch value={showPurport} onValueChange={setShowPurport} trackColor={{ true: '#FF8000' }} />
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionLabel}>{t('reader.font_size', 'Размер шрифта')}</Text>
                            <View style={styles.fontSizeControls}>
                                <TouchableOpacity onPress={() => setFontSizeBase(prev => Math.max(12, prev - 2))} style={styles.fontBtn}>
                                    <Text style={styles.fontBtnText}>A-</Text>
                                </TouchableOpacity>
                                <Text style={styles.fontSizeValue}>{fontSizeBase}</Text>
                                <TouchableOpacity onPress={() => setFontSizeBase(prev => Math.min(30, prev + 2))} style={styles.fontBtn}>
                                    <Text style={styles.fontBtnText}>A+</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('reader.font_bold', 'Жирный шрифт')}</Text>
                                <Switch value={fontBold} onValueChange={setFontBold} trackColor={{ true: '#FF8000' }} />
                            </View>

                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('reader.font_serif', 'С засечками')}</Text>
                                <Switch value={isSerif} onValueChange={setIsSerif} trackColor={{ true: '#FF8000' }} />
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionLabel}>{t('reader.theme', 'Тема оформления')}</Text>
                            <View style={styles.themeSelector}>
                                {['paper', 'sepia', 'ancient', 'dark'].map((tName) => (
                                    <TouchableOpacity
                                        key={tName}
                                        style={[
                                            styles.themeBtn,
                                            readerTheme === tName && styles.activeThemeBtn,
                                            { backgroundColor: tName === 'paper' ? '#FFF8E1' : tName === 'sepia' ? '#F4ECD8' : tName === 'ancient' ? '#F1E5AC' : '#1A1A1A' }
                                        ]}
                                        onPress={() => setReaderTheme(tName as any)}
                                    >
                                        <Text style={[
                                            styles.themeBtnText,
                                            { color: tName === 'dark' ? '#FFF' : '#333' }
                                        ]}>
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
                <View style={styles.modalOverlay}>
                    <View style={[styles.settingsContainer, { height: '80%' }]}>
                        <View style={styles.settingsHeader}>
                            <Text style={styles.settingsTitle}>{t('reader.bookmarks', 'Ваши закладки')}</Text>
                            <TouchableOpacity onPress={() => setShowBookmarksList(false)} style={styles.closeBtn}>
                                <X size={24} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {bookmarks.length === 0 ? (
                                <Text style={styles.emptyText}>{t('reader.no_bookmarks', 'Закладок пока нет')}</Text>
                            ) : (
                                bookmarks.map((bId) => {
                                    const [bCode, ch, v] = bId.split('-');
                                    if (bCode !== bookCode) return null; // Only show for current book
                                    return (
                                        <TouchableOpacity
                                            key={bId}
                                            style={styles.bookmarkItem}
                                            onPress={() => {
                                                const vIndex = verses.findIndex(ver => ver.verse === v);
                                                if (vIndex !== -1) handleVersePress(vIndex);
                                                setShowBookmarksList(false);
                                            }}
                                        >
                                            <Text style={styles.bookmarkText}>
                                                {t('reader.chapter')} {ch}, {t('reader.text')} {v}
                                            </Text>
                                            <TouchableOpacity onPress={() => toggleBookmark({ chapter: parseInt(ch), verse: v } as any)}>
                                                <Trash2 size={18} color="#FF5252" />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    )
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <View style={[
                styles.navigationHeader,
                readerTheme === 'dark' && { backgroundColor: '#222', borderBottomColor: '#444' },
                readerTheme === 'ancient' && { backgroundColor: 'rgba(234, 215, 164, 0.8)', borderBottomColor: '#DBC18B' }
            ]}>
                <View style={[
                    styles.chapterSelector,
                    readerTheme === 'dark' && { backgroundColor: '#222', borderBottomColor: '#333' },
                    readerTheme === 'ancient' && { backgroundColor: 'transparent', borderBottomColor: '#DBC18B' }
                ]}>
                    <TouchableOpacity
                        onPress={goToPreviousChapter}
                        disabled={!canGoPrevious()}
                        style={[styles.navButton, !canGoPrevious() && styles.navButtonDisabled]}
                    >
                        <ChevronLeft size={24} color={ModernVedicTheme.colors.primary} />
                    </TouchableOpacity>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chapterScroll}>
                        {chapters.map((ch) => (
                            <TouchableOpacity
                                key={`${ch.canto}-${ch.chapter}`}
                                style={[styles.chapterBtn, currentChapter === ch.chapter && styles.activeBtn]}
                                onPress={() => loadVerses(ch.chapter)}
                            >
                                <Text style={[
                                    styles.chapterText,
                                    currentChapter === ch.chapter && styles.activeText,
                                    readerTheme === 'dark' && { color: '#888' },
                                    readerTheme === 'ancient' && { color: '#5D4037' },
                                    currentChapter === ch.chapter && readerTheme === 'dark' && { color: '#FF8000' },
                                    currentChapter === ch.chapter && readerTheme === 'ancient' && { color: '#BF360C' }
                                ]}>
                                    {t('reader.chapter', 'Chapter')} {ch.chapter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        onPress={goToNextChapter}
                        disabled={!canGoNext()}
                        style={[styles.navButton, !canGoNext() && styles.navButtonDisabled]}
                    >
                        <ChevronRight size={24} color={ModernVedicTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {verses.length > 0 && (
                    <View style={[
                        styles.verseSelector,
                        readerTheme === 'dark' && { backgroundColor: '#2a2a2a' },
                        readerTheme === 'ancient' && { backgroundColor: 'rgba(219, 193, 139, 0.5)' }
                    ]}>
                        <ScrollView
                            ref={verseSelectorRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.verseScroll}
                            contentContainerStyle={{ paddingHorizontal: 12 }}
                        >
                            {verses.map((v, index) => (
                                <TouchableOpacity
                                    key={`selector-${v.id}`}
                                    style={[
                                        styles.verseBtn,
                                        activeVerseIndex === index && styles.activeVerseBtn,
                                        activeVerseIndex === index && readerTheme === 'dark' && { backgroundColor: '#444' },
                                        activeVerseIndex === index && readerTheme === 'ancient' && { backgroundColor: '#C8AD7F' }
                                    ]}
                                    onPress={() => handleVersePress(index)}
                                >
                                    <Text style={[
                                        styles.verseBtnText,
                                        activeVerseIndex === index && styles.activeVerseBtnText,
                                        readerTheme === 'dark' && { color: '#888' },
                                        readerTheme === 'ancient' && { color: '#5D4037' },
                                        activeVerseIndex === index && readerTheme === 'dark' && { color: '#FF8000' },
                                        activeVerseIndex === index && readerTheme === 'ancient' && { color: '#BF360C' }
                                    ]}>
                                        {v.verse}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={[styles.loadingContainer, readerTheme !== 'ancient' && styles[readerTheme]]}>
                    <ActivityIndicator size="large" color="#FF8000" />
                </View>
            ) : (
                <ScrollView
                    ref={mainScrollRef}
                    contentContainerStyle={[styles.textContainer, readerTheme !== 'ancient' && styles[readerTheme]]}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    {verses.map((v, index) => {
                        const isBookmarked = bookmarks.includes(`${bookCode}-${v.chapter}-${v.verse}`);
                        return (
                            <View
                                key={v.id}
                                style={[
                                    styles.verseContainer,
                                    readerTheme === 'dark' && { backgroundColor: '#2a2a2a' },
                                    readerTheme === 'ancient' && { backgroundColor: 'rgba(234, 215, 164, 0.6)', borderColor: '#DBC18B', borderWidth: 1 }
                                ]}
                                onLayout={(event: LayoutChangeEvent) => onVerseLayout(index, event.nativeEvent.layout.y)}
                            >
                                <View style={styles.verseHeader}>
                                    <Text style={[
                                        styles.verseNumber,
                                        readerTheme === 'dark' && { color: '#FF8000' },
                                        readerTheme === 'ancient' && { color: '#BF360C' }
                                    ]}>{t('reader.text', 'Text')} {v.verse}</Text>
                                    <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity onPress={() => shareVerse(v)} style={{ padding: 5, marginRight: 10 }}>
                                            <Share2 size={18} color={ModernVedicTheme.colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => toggleBookmark(v)} style={{ padding: 5 }}>
                                            <Star size={20} color={isBookmarked ? '#FFD700' : ModernVedicTheme.colors.textSecondary} fill={isBookmarked ? '#FFD700' : 'transparent'} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {v.devanagari && showSanskrit && (
                                    <Text style={[
                                        styles.sanskrit,
                                        { fontSize: fontSizeBase + 2, fontWeight: fontBold ? 'bold' : 'normal', color: readerTheme === 'dark' ? '#DDD' : readerTheme === 'ancient' ? '#3E2723' : '#2c3e50' }
                                    ]}>
                                        {v.devanagari}
                                    </Text>
                                )}
                                {showTransliteration && (
                                    <Text style={[
                                        styles.transliteration,
                                        { fontSize: fontSizeBase - 1, fontWeight: fontBold ? 'bold' : 'normal', color: readerTheme === 'dark' ? '#AAA' : readerTheme === 'ancient' ? '#5D4037' : '#5d6d7e' }
                                    ]}>
                                        {v.transliteration}
                                    </Text>
                                )}
                                {showTranslation && (
                                    <Text style={[
                                        styles.translation,
                                        { fontSize: fontSizeBase + 1, fontWeight: fontBold ? 'bold' : '600', color: readerTheme === 'dark' ? '#EEE' : readerTheme === 'ancient' ? '#212121' : '#1a1a1a' }
                                    ]}>
                                        {v.translation}
                                    </Text>
                                )}
                                {v.purport && showPurport && (
                                    <View>
                                        <View style={[
                                            styles.purportDivider,
                                            readerTheme === 'dark' && { backgroundColor: '#444' },
                                            readerTheme === 'ancient' && { backgroundColor: '#DBC18B' }
                                        ]} />
                                        <Text style={[
                                            styles.purport,
                                            {
                                                fontSize: fontSizeBase,
                                                fontWeight: fontBold ? 'bold' : 'normal',
                                                fontFamily: isSerif ? (Platform.OS === 'ios' ? 'Georgia' : 'serif') : undefined,
                                                color: readerTheme === 'dark' ? '#CCC' : readerTheme === 'ancient' ? '#3E2723' : '#34495e'
                                            }
                                        ]}>
                                            {v.purport}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                    <View style={styles.footerNav}>
                        <TouchableOpacity
                            onPress={goToPreviousChapter}
                            disabled={!canGoPrevious()}
                            style={[
                                styles.footerBtn,
                                !canGoPrevious() && styles.footerBtnDisabled,
                                readerTheme === 'dark' && { backgroundColor: '#333', borderColor: '#444' },
                                readerTheme === 'ancient' && { backgroundColor: 'rgba(219, 193, 139, 0.7)', borderColor: '#BF360C' }
                            ]}
                        >
                            <Text style={[
                                styles.footerBtnText,
                                readerTheme === 'dark' && { color: '#FF8000' },
                                readerTheme === 'ancient' && { color: '#BF360C' }
                            ]}>
                                <ArrowLeft size={16} color={readerTheme === 'dark' ? '#FF8000' : readerTheme === 'ancient' ? '#BF360C' : ModernVedicTheme.colors.primary} /> {t('reader.prev', 'Prev')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={goToNextChapter}
                            disabled={!canGoNext()}
                            style={[
                                styles.footerBtn,
                                !canGoNext() && styles.footerBtnDisabled,
                                readerTheme === 'dark' && { backgroundColor: '#333', borderColor: '#444' },
                                readerTheme === 'ancient' && { backgroundColor: 'rgba(219, 193, 139, 0.7)', borderColor: '#BF360C' }
                            ]}
                        >
                            <Text style={[
                                styles.footerBtnText,
                                readerTheme === 'dark' && { color: '#FF8000' },
                                readerTheme === 'ancient' && { color: '#BF360C' }
                            ]}>
                                {t('reader.next', 'Next')} <ArrowRight size={16} color={readerTheme === 'dark' ? '#FF8000' : readerTheme === 'ancient' ? '#BF360C' : ModernVedicTheme.colors.primary} />
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </>
    );

    return renderWithTheme();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E1', // Paper color
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    settingsContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '70%',
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    settingsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 5,
    },
    closeBtnText: {
        fontSize: 20,
        color: '#999',
    },
    settingsScroll: {
        marginBottom: 20,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingLabel: {
        fontSize: 16,
        color: '#444',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#888',
        marginTop: 15,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    fontSizeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    fontBtn: {
        width: 50,
        height: 40,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    fontBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF8000',
    },
    fontSizeValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 20,
        minWidth: 30,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 10,
    },
    themeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    themeBtn: {
        flex: 1,
        height: 45,
        marginHorizontal: 5,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    activeThemeBtn: {
        borderColor: '#FF8000',
        borderWidth: 2,
    },
    themeBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    paper: { backgroundColor: '#FFF8E1' },
    sepia: { backgroundColor: '#F4ECD8' },
    ancient: { backgroundColor: '#F1E5AC' },
    dark: { backgroundColor: '#1A1A1A' },
    verseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    purportDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 15,
        width: '100%',
    },
    bookmarkItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    bookmarkText: {
        fontSize: 16,
        color: '#333',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#999',
        fontSize: 16,
    },
    navigationHeader: {
        backgroundColor: '#FFF',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 10,
    },
    chapterSelector: {
        height: 50,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    verseSelector: {
        height: 40,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    verseScroll: {
        flex: 1,
    },
    verseBtn: {
        paddingHorizontal: 12,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 40,
    },
    activeVerseBtn: {
        backgroundColor: '#FFF4E5',
        borderBottomWidth: 2,
        borderBottomColor: '#FF8000',
    },
    verseBtnText: {
        fontSize: 13,
        color: '#666',
    },
    activeVerseBtnText: {
        color: '#FF8000',
        fontWeight: 'bold',
    },
    navButton: {
        width: 40,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navButtonDisabled: {
        opacity: 0.2,
    },
    navButtonText: {
        fontSize: 18,
        color: '#FF8000',
        fontWeight: 'bold',
    },
    navButtonTextDisabled: {
        color: '#999',
    },
    chapterScroll: {
        flex: 1,
    },
    chapterBtn: {
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBtn: {
        borderBottomWidth: 2,
        borderBottomColor: '#FF8000',
    },
    chapterText: {
        fontSize: 14,
        color: '#666',
    },
    activeText: {
        color: '#FF8000',
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
    },
    textContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    verseContainer: {
        marginBottom: 32,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    verseNumber: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FF8000',
        marginBottom: 12,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sanskrit: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 12,
        color: '#2c3e50',
        lineHeight: 28,
    },
    transliteration: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 16,
        color: '#5d6d7e',
        fontStyle: 'italic',
        lineHeight: 22,
    },
    translation: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 16,
        lineHeight: 26,
        color: '#1a1a1a',
    },
    purport: {
        fontSize: 16,
        lineHeight: 26,
        color: '#34495e',
        marginTop: 8,
    },
    footerNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 40,
    },
    footerBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF8000',
    },
    footerBtnDisabled: {
        borderColor: '#CCC',
        opacity: 0.5,
    },
    footerBtnText: {
        color: '#FF8000',
        fontWeight: '600',
    },
});
