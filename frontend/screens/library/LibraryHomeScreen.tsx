import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, BackHandler, InteractionManager, Platform } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { libraryService } from '../../services/libraryService';
import { offlineBookService, formatBytes } from '../../services/offlineBookService';
import { ScriptureBook } from '../../types/library';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ArrowLeft, BookOpenText, Sparkles, ChevronRight } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { GodModeStatusBanner } from '../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { handleAiBackNavigation, withAiNavigationMeta } from '../../utils/aiNavigation';

type BookCardProps = {
    item: ScriptureBook;
    isSaved: boolean;
    isSaving: boolean;
    bookSize?: number;
    saveProgress: number;
    saveStatus: string;
    isPhotoBg: boolean;
    isDarkMode: boolean;
    roleColors: ReturnType<typeof useRoleTheme>['colors'];
    getBookTitle: (book: ScriptureBook) => string;
    getBookDescription: (book: ScriptureBook) => string;
    onPress: (book: ScriptureBook) => void;
    onLongPress: (book: ScriptureBook) => void;
    t: ReturnType<typeof useTranslation>['t'];
    reducedVisuals: boolean;
};

const BookCard = React.memo<BookCardProps>(({
    item,
    isSaved,
    isSaving,
    bookSize,
    saveProgress,
    saveStatus,
    isPhotoBg,
    isDarkMode,
    roleColors,
    getBookTitle,
    getBookDescription,
    onPress,
    onLongPress,
    t,
    reducedVisuals,
}) => {
    const titleColor = isPhotoBg ? '#FFFFFF' : roleColors.textPrimary;
    const subColor = isPhotoBg ? 'rgba(255,255,255,0.7)' : roleColors.textSecondary;
    const cardBackground = isPhotoBg
        ? 'rgba(255,255,255,0.12)'
        : (isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.82)');
    const cardBorder = isPhotoBg
        ? 'rgba(255,255,255,0.22)'
        : roleColors.border;
    const accentColor = roleColors.accent;
    const iconBackground = reducedVisuals
        ? (isDarkMode ? 'rgba(255,255,255,0.04)' : roleColors.surface)
        : (isDarkMode ? 'rgba(255,255,255,0.05)' : roleColors.surfaceElevated);
    const chevronBackground = reducedVisuals
        ? 'transparent'
        : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)');

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder }]}
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress(item)}
            delayLongPress={500}
            activeOpacity={0.8}
        >
            {!reducedVisuals && (isPhotoBg || isDarkMode) && (
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={20}
                    reducedTransparencyFallbackColor={roleColors.surfaceElevated}
                />
            )}

            {!reducedVisuals && (
                <LinearGradient
                    colors={isDarkMode ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(255,255,255,0.8)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            )}

            <View style={[styles.iconContainer, { backgroundColor: iconBackground, borderColor: cardBorder }]}>
                <BookOpenText size={24} color={accentColor} />
            </View>

            <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                    <Text
                        style={[styles.cardTitle, { color: titleColor }]}
                        numberOfLines={1}
                    >
                        {getBookTitle(item)}
                    </Text>
                    {isSaved && <View style={[styles.dot, styles.savedDot]} />}
                </View>
                <Text
                    style={[styles.cardDescription, { color: subColor }]}
                    numberOfLines={2}
                >
                    {getBookDescription(item) || t('library.scripture', 'Sacred scripture')}
                </Text>

                {bookSize && (
                    <Text style={[styles.sizeText, styles.sizeTextSaved, { color: accentColor }]}>
                        {formatBytes(bookSize)} • {t('library.saved', 'Saved')}
                    </Text>
                )}

                {isSaving && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${saveProgress}%`, backgroundColor: accentColor }]} />
                        <Text style={styles.progressText}>{saveStatus}</Text>
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                {isSaving ? (
                    <ActivityIndicator size="small" color={accentColor} />
                ) : (
                    <View style={[styles.chevronBtn, { backgroundColor: chevronBackground }]}>
                        <ChevronRight size={18} color={roleColors.textSecondary} />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => (
    prevProps.item === nextProps.item
    && prevProps.isSaved === nextProps.isSaved
    && prevProps.isSaving === nextProps.isSaving
    && prevProps.bookSize === nextProps.bookSize
    && prevProps.saveProgress === nextProps.saveProgress
    && prevProps.saveStatus === nextProps.saveStatus
    && prevProps.isPhotoBg === nextProps.isPhotoBg
    && prevProps.isDarkMode === nextProps.isDarkMode
    && prevProps.roleColors === nextProps.roleColors
    && prevProps.getBookTitle === nextProps.getBookTitle
    && prevProps.getBookDescription === nextProps.getBookDescription
    && prevProps.onPress === nextProps.onPress
    && prevProps.onLongPress === nextProps.onLongPress
    && prevProps.t === nextProps.t
    && prevProps.reducedVisuals === nextProps.reducedVisuals
));

export const LibraryHomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<any>();
    const { user } = useUser();
    const { i18n } = useTranslation();
    const { isDarkMode, portalBackgroundType } = useSettings();
    const { t } = useTranslation();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const [books, setBooks] = useState<ScriptureBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [savedBooks, setSavedBooks] = useState<string[]>([]);
    const [bookSizes, setBookSizes] = useState<{ [code: string]: number }>({});
    const getBookTitle = React.useCallback((book: ScriptureBook) => (
        i18n.language?.startsWith('ru') ? (book.name_ru || book.name_en) : (book.name_en || book.name_ru)
    ), [i18n.language]);
    const getBookDescription = React.useCallback((book: ScriptureBook) => (
        i18n.language?.startsWith('ru') ? (book.description_ru || book.description_en) : (book.description_en || book.description_ru)
    ), [i18n.language]);
    const [savingBook, setSavingBook] = useState<string | null>(null);
    const [saveProgress, setSaveProgress] = useState<number>(0);
    const [saveStatus, setSaveStatus] = useState<string>('');
    const isPhotoBg = portalBackgroundType === 'image' && isDarkMode;
    const isMountedRef = useRef(true);
    const savedBooksSet = useMemo(() => new Set(savedBooks), [savedBooks]);
    const reducedVisuals = Platform.OS === 'android';
    const aiMeta = route.params;
    const listTuning = useMemo(() => (
        Platform.OS === 'android'
            ? {
                initialNumToRender: 5,
                maxToRenderPerBatch: 5,
                windowSize: 5,
                updateCellsBatchingPeriod: 80,
            }
            : {
                initialNumToRender: 8,
                maxToRenderPerBatch: 8,
                windowSize: 7,
                updateCellsBatchingPeriod: 50,
            }
    ), []);

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

    const loadSavedBooksInfo = useCallback(async () => {
        try {
            const saved = await offlineBookService.getSavedBooks();
            if (!isMountedRef.current) {
                return;
            }
            const codes = saved.map(b => b.code);
            setSavedBooks(codes);

            const sizes: { [code: string]: number } = {};
            for (const book of saved) {
                sizes[book.code] = book.sizeBytes;
            }
            setBookSizes(sizes);
        } catch (error) {
            console.error('Failed to load saved books info', error);
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Reload saved books status when screen is focused
    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                loadSavedBooksInfo().catch((error) => {
                    console.error('Failed to refresh saved books info after interactions', error);
                });
            });
            return () => task.cancel();
        }, [loadSavedBooksInfo])
    );

    const scheduleSavedBooksInfoLoad = useCallback(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            loadSavedBooksInfo().catch((error) => {
                console.error('Failed to schedule saved books info load', error);
            });
        });
        return () => task.cancel();
    }, [loadSavedBooksInfo]);

    const loadBooks = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const data = await libraryService.getBooks();
            const normalizedBooks = Array.isArray(data)
                ? data
                : (Array.isArray((data as any)?.items) ? (data as any).items : []);
            if (!isMountedRef.current) {
                return;
            }
            setBooks(normalizedBooks);
            scheduleSavedBooksInfoLoad();
        } catch (error) {
            console.error('Failed to load books', error);
            if (!isMountedRef.current) {
                return;
            }
            setBooks([]);
            setLoadError(t('library.load_error', 'Failed to load the library. Check your internet and try again.'));
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [scheduleSavedBooksInfoLoad, t]);

    useEffect(() => {
        loadBooks().catch((error) => {
            console.error('Failed to load library books', error);
        });
    }, [loadBooks]);

    const handleBookPress = useCallback((book: ScriptureBook) => {
        navigation.navigate('Reader', withAiNavigationMeta({
            bookCode: book.code,
            title: getBookTitle(book),
        }, aiMeta?.returnTo || 'chat'));
    }, [aiMeta?.returnTo, getBookTitle, navigation]);

    const handleSaveBook = useCallback(async (book: ScriptureBook) => {
        if (savingBook) return; // Already saving

        setSavingBook(book.code);
        setSaveProgress(0);
        setSaveStatus(t('library.downloading', 'Loading...'));

        const success = await offlineBookService.saveBookOffline(book, (progress, status) => {
            setSaveProgress(progress);
            setSaveStatus(status);
        });

        if (success) {
            await loadSavedBooksInfo();
        } else {
            Alert.alert(
                t('library.error', 'Error'),
                t('library.save_error', 'Failed to save the book. Try again later.')
            );
        }

        setSavingBook(null);
        setSaveProgress(0);
        setSaveStatus('');
    }, [loadSavedBooksInfo, savingBook, t]);

    const handleRemoveBook = useCallback((book: ScriptureBook) => {
        Alert.alert(
            t('library.delete_title', 'Delete book?'),
            t('library.delete_message', 'The book will be removed from local storage. You can download it again later.'),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('common.delete', 'Delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await offlineBookService.removeBook(book.code);
                            await loadSavedBooksInfo();
                        } catch (error) {
                            console.error('Failed to remove saved book', error);
                        }
                    }
                }
            ]
        );
    }, [loadSavedBooksInfo, t]);

    const handleLongPress = useCallback((book: ScriptureBook) => {
        const isSaved = savedBooksSet.has(book.code);

        const options = [];

        if (isSaved) {
            options.push({
                text: t('library.delete_offline', 'Remove from downloads'),
                style: 'destructive' as const,
                onPress: () => handleRemoveBook(book)
            });
        } else {
            options.push({
                text: t('library.download', 'Download for offline'),
                onPress: () => handleSaveBook(book)
            });
        }

        options.push({ text: t('common.cancel', 'Cancel'), style: 'cancel' as const });

        Alert.alert(
            getBookTitle(book),
            isSaved
                ? t('library.saved_info', 'The book is saved for offline reading')
                : t('library.not_saved_info', 'The book is not downloaded'),
            options
        );
    }, [getBookTitle, handleRemoveBook, handleSaveBook, savedBooksSet, t]);

    const keyExtractor = useCallback((item: ScriptureBook) => item.code, []);

    const renderBookItem = useCallback(({ item }: { item: ScriptureBook }) => (
        <BookCard
            item={item}
            isSaved={savedBooksSet.has(item.code)}
            isSaving={savingBook === item.code}
            bookSize={bookSizes[item.code]}
            saveProgress={saveProgress}
            saveStatus={saveStatus}
            isPhotoBg={isPhotoBg}
            isDarkMode={isDarkMode}
            roleColors={roleColors}
            getBookTitle={getBookTitle}
            getBookDescription={getBookDescription}
            onPress={handleBookPress}
            onLongPress={handleLongPress}
            t={t}
            reducedVisuals={reducedVisuals}
        />
    ), [
        bookSizes,
        getBookDescription,
        getBookTitle,
        handleBookPress,
        handleLongPress,
        isDarkMode,
        isPhotoBg,
        reducedVisuals,
        roleColors,
        saveProgress,
        saveStatus,
        savedBooksSet,
        savingBook,
        t,
    ]);

    const listEmptyComponent = useMemo(() => (
        <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>
                {t('library.empty_title', 'No books yet')}
            </Text>
            <Text style={[styles.emptyMessage, { color: isPhotoBg ? 'rgba(255,255,255,0.78)' : roleColors.textSecondary }]}>
                {t('library.empty_message', 'Books will appear here after syncing with the server.')}
            </Text>
        </View>
    ), [isPhotoBg, roleColors.textPrimary, roleColors.textSecondary, t]);

    if (loading) {
        return (
            <ScreenScaffold variant="media" enableAura>
                <View style={[styles.container, styles.center, { backgroundColor: isPhotoBg ? 'transparent' : roleColors.background }]}>
                    <ActivityIndicator size="large" color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                </View>
            </ScreenScaffold>
        );
    }

    const content = (
        <View style={[styles.container, { backgroundColor: isPhotoBg ? 'transparent' : roleColors.background }]}>
            <GodModeStatusBanner />
            <View style={styles.headerWrap}>
                {aiMeta?.origin === 'ai_chat' ? (
                    <TouchableOpacity
                        onPress={() => handleAiBackNavigation(navigation as any, aiMeta)}
                        style={[styles.backChip, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.surfaceElevated, borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border }]}
                        activeOpacity={0.85}
                    >
                        <ArrowLeft size={14} color={isPhotoBg ? '#FFFFFF' : roleColors.textPrimary} />
                        <Text style={[styles.backChipText, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>
                            {t('common.back', 'Back')}
                        </Text>
                    </TouchableOpacity>
                ) : null}
                <View style={[styles.headerChip, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft, borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border }]}>
                    <Sparkles size={14} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                    <Text style={[styles.headerChipText, { color: isPhotoBg ? '#FFFFFF' : roleColors.textSecondary }]}>
                        {t('library.scripture', 'Sacred scriptures')}
                    </Text>
                </View>
            </View>
            {loadError ? (
                <View style={[styles.emptyState, { paddingHorizontal: 20 }]}>
                    <Text style={[styles.emptyTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>
                        {t('library.unavailable', 'Library is temporarily unavailable')}
                    </Text>
                    <Text style={[styles.emptyMessage, { color: isPhotoBg ? 'rgba(255,255,255,0.78)' : roleColors.textSecondary }]}>
                        {loadError}
                    </Text>
                    <TouchableOpacity
                        onPress={loadBooks}
                        style={[styles.retryButton, { backgroundColor: roleColors.accent }]}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList<ScriptureBook>
                    data={books}
                    renderItem={renderBookItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={books.length === 0 ? styles.emptyListContainer : styles.list}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === 'android'}
                    initialNumToRender={listTuning.initialNumToRender}
                    maxToRenderPerBatch={listTuning.maxToRenderPerBatch}
                    windowSize={listTuning.windowSize}
                    updateCellsBatchingPeriod={listTuning.updateCellsBatchingPeriod}
                    ListEmptyComponent={listEmptyComponent}
                />
            )}
        </View>
    );

    return (
        <ScreenScaffold variant="media" enableAura>
            {content}
        </ScreenScaffold>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerWrap: {
        paddingHorizontal: 20,
        paddingTop: 16,
        marginBottom: 8,
        gap: 10,
    },
    backChip: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    backChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    headerChip: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    headerChipText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyListContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    emptyState: {
        flex: 1,
        minHeight: 280,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 320,
    },
    retryButton: {
        marginTop: 16,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    card: {
        flexDirection: 'row',
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 19,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 8,
    },
    savedDot: {
        backgroundColor: '#10B981',
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 2,
    },
    sizeText: {
        fontSize: 12,
        marginTop: 8,
        fontWeight: '700',
    },
    sizeTextSaved: {
        opacity: 0.8,
    },
    progressContainer: {
        marginTop: 10,
        height: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 9,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 9,
    },
    progressText: {
        fontSize: 9,
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 6,
        fontWeight: '800',
    },
    actions: {
        marginLeft: 4,
    },
    chevronBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
});
