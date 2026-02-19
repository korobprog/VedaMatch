import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Animated } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { libraryService } from '../../services/libraryService';
import { offlineBookService, formatBytes, SavedBookInfo } from '../../services/offlineBookService';
import { ScriptureBook } from '../../types/library';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { BookOpenText, Download, CheckCircle, Sparkles, ChevronRight } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { GodModeStatusBanner } from '../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

export const LibraryHomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user } = useUser();
    const { isDarkMode, portalBackgroundType } = useSettings();
    const { t } = useTranslation();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const [books, setBooks] = useState<ScriptureBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [savedBooks, setSavedBooks] = useState<string[]>([]);
    const [bookSizes, setBookSizes] = useState<{ [code: string]: number }>({});
    const [savingBook, setSavingBook] = useState<string | null>(null);
    const [saveProgress, setSaveProgress] = useState<number>(0);
    const [saveStatus, setSaveStatus] = useState<string>('');
    const isPhotoBg = portalBackgroundType === 'image';

    useEffect(() => {
        loadBooks();
    }, []);

    // Reload saved books status when screen is focused
    useFocusEffect(
        useCallback(() => {
            loadSavedBooksInfo();
        }, [])
    );

    const loadBooks = async () => {
        try {
            setLoading(true);
            const data = await libraryService.getBooks();
            setBooks(data);
            await loadSavedBooksInfo();
        } catch (error) {
            console.error('Failed to load books', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSavedBooksInfo = async () => {
        try {
            const saved = await offlineBookService.getSavedBooks();
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
    };

    const handleBookPress = (book: ScriptureBook) => {
        navigation.navigate('Reader', { bookCode: book.code, title: book.name_ru || book.name_en });
    };

    const handleSaveBook = async (book: ScriptureBook) => {
        if (savingBook) return; // Already saving

        setSavingBook(book.code);
        setSaveProgress(0);
        setSaveStatus(t('library.downloading', 'Загрузка...'));

        const success = await offlineBookService.saveBookOffline(book, (progress, status) => {
            setSaveProgress(progress);
            setSaveStatus(status);
        });

        if (success) {
            await loadSavedBooksInfo();
        } else {
            Alert.alert(
                t('library.error', 'Ошибка'),
                t('library.save_error', 'Не удалось сохранить книгу. Попробуйте позже.')
            );
        }

        setSavingBook(null);
        setSaveProgress(0);
        setSaveStatus('');
    };

    const handleRemoveBook = (book: ScriptureBook) => {
        Alert.alert(
            t('library.delete_title', 'Удалить книгу?'),
            t('library.delete_message', 'Книга будет удалена из локального хранилища. Вы сможете скачать её снова.'),
            [
                { text: t('common.cancel', 'Отмена'), style: 'cancel' },
                {
                    text: t('common.delete', 'Удалить'),
                    style: 'destructive',
                    onPress: async () => {
                        await offlineBookService.removeBook(book.code);
                        await loadSavedBooksInfo();
                    }
                }
            ]
        );
    };

    const handleLongPress = (book: ScriptureBook) => {
        const isSaved = savedBooks.includes(book.code);

        const options = [];

        if (isSaved) {
            options.push({
                text: t('library.delete_offline', 'Удалить из загрузок'),
                style: 'destructive' as const,
                onPress: () => handleRemoveBook(book)
            });
        } else {
            options.push({
                text: t('library.download', 'Скачать для офлайн'),
                onPress: () => handleSaveBook(book)
            });
        }

        options.push({ text: t('common.cancel', 'Отмена'), style: 'cancel' as const });

        Alert.alert(
            book.name_ru || book.name_en,
            isSaved
                ? t('library.saved_info', 'Книга сохранена для офлайн чтения')
                : t('library.not_saved_info', 'Книга не загружена'),
            options
        );
    };

    const renderBookItem = ({ item, index }: { item: ScriptureBook, index: number }) => {
        const isSaved = savedBooks.includes(item.code);
        const isSaving = savingBook === item.code;
        const bookSize = bookSizes[item.code];
        const titleColor = isPhotoBg ? '#FFFFFF' : roleColors.textPrimary;
        const subColor = isPhotoBg ? 'rgba(255,255,255,0.7)' : roleColors.textSecondary;
        const cardBackground = isPhotoBg
            ? 'rgba(255,255,255,0.12)'
            : (isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.82)');
        const cardBorder = isPhotoBg
            ? 'rgba(255,255,255,0.22)'
            : roleColors.border;
        const accentColor = roleColors.accent;

        // Animation for entrance
        const translateY = useRef(new Animated.Value(20)).current;
        const opacity = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 400,
                    delay: index * 100,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    delay: index * 100,
                    useNativeDriver: true,
                })
            ]).start();
        }, []);

        return (
            <Animated.View style={{ transform: [{ translateY }], opacity }}>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder }]}
                    onPress={() => handleBookPress(item)}
                    onLongPress={() => handleLongPress(item)}
                    delayLongPress={500}
                    activeOpacity={0.8}
                >
                    {(isPhotoBg || isDarkMode) && (
                        <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType={isDarkMode ? 'dark' : 'light'}
                            blurAmount={20}
                            reducedTransparencyFallbackColor={roleColors.surfaceElevated}
                        />
                    )}

                    <LinearGradient
                        colors={isDarkMode ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(255,255,255,0.8)', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Book icon */}
                    <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : roleColors.surfaceElevated, borderColor: cardBorder }]}>
                        <BookOpenText size={24} color={accentColor} />
                    </View>

                    {/* Book info */}
                    <View style={styles.textContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <Text
                                style={[styles.cardTitle, { color: titleColor }]}
                                numberOfLines={1}
                            >
                                {item.name_ru || item.name_en}
                            </Text>
                            {isSaved && <View style={[styles.dot, { backgroundColor: '#10B981' }]} />}
                        </View>
                        <Text
                            style={[styles.cardDescription, { color: subColor }]}
                            numberOfLines={2}
                        >
                            {item.description_ru || item.description_en || t('library.scripture', 'Священное писание')}
                        </Text>

                        {bookSize && (
                            <Text style={[styles.sizeText, { color: accentColor, opacity: 0.8 }]}>
                                {formatBytes(bookSize)} • {t('library.saved', 'Сохранено')}
                            </Text>
                        )}

                        {isSaving && (
                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${saveProgress}%`, backgroundColor: accentColor }]} />
                                <Text style={styles.progressText}>{saveStatus}</Text>
                            </View>
                        )}
                    </View>

                    {/* Action button */}
                    <View style={styles.actions}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color={accentColor} />
                        ) : (
                            <View style={[styles.chevronBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <ChevronRight size={18} color={roleColors.textSecondary} />
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: isPhotoBg ? 'transparent' : roleColors.background }]}>
                <ActivityIndicator size="large" color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
            </View>
        );
    }

    const content = (
        <View style={[styles.container, { backgroundColor: isPhotoBg ? 'transparent' : roleColors.background }]}>
            <GodModeStatusBanner />
            <View style={styles.headerWrap}>
                <View style={[styles.headerChip, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft, borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border }]}>
                    <Sparkles size={14} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                    <Text style={[styles.headerChipText, { color: isPhotoBg ? '#FFFFFF' : roleColors.textSecondary }]}>
                        {t('library.scripture', 'Священные писания')}
                    </Text>
                </View>
            </View>
            <FlatList<ScriptureBook>
                data={books}
                renderItem={renderBookItem}
                keyExtractor={(item: ScriptureBook) => item.code}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );

    return content;
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
