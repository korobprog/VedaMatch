import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import { libraryService } from '../../services/libraryService';
import { offlineBookService, formatBytes, SavedBookInfo } from '../../services/offlineBookService';
import { ScriptureBook } from '../../types/library';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { BookOpenText, Download, CheckCircle, Sparkles } from 'lucide-react-native';
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

    const renderBookItem = ({ item }: { item: ScriptureBook }) => {
        const isSaved = savedBooks.includes(item.code);
        const isSaving = savingBook === item.code;
        const bookSize = bookSizes[item.code];
        const titleColor = isPhotoBg ? '#FFFFFF' : roleColors.textPrimary;
        const subColor = isPhotoBg ? 'rgba(255,255,255,0.82)' : roleColors.textSecondary;
        const cardBackground = isPhotoBg
            ? 'rgba(255,255,255,0.14)'
            : (isDarkMode ? roleColors.surfaceElevated : roleColors.surface);
        const cardBorder = isPhotoBg
            ? 'rgba(255,255,255,0.3)'
            : roleColors.border;
        const iconColor = isPhotoBg ? '#FFFFFF' : roleColors.accent;
        const iconBg = isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.accentSoft;
        const actionBg = isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft;
        const actionBorder = isPhotoBg ? 'rgba(255,255,255,0.32)' : roleColors.border;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder }]}
                onPress={() => handleBookPress(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
                activeOpacity={0.88}
            >
                {(isPhotoBg || isDarkMode) && (
                    <BlurView
                        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={14}
                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.65)' : roleColors.surfaceElevated}
                    />
                )}

                {/* Book icon */}
                <View style={[styles.iconContainer, { backgroundColor: iconBg, borderColor: cardBorder }]}>
                    <BookOpenText size={28} color={iconColor} />
                </View>

                {/* Book info */}
                <View style={styles.textContainer}>
                    <Text
                        style={[styles.cardTitle, { color: titleColor }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.name_ru || item.name_en}
                    </Text>
                    <Text
                        style={[styles.cardDescription, { color: subColor }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {item.description_ru || item.description_en || t('library.scripture', 'Священное писание')}
                    </Text>

                    {/* Size info */}
                    {bookSize && (
                        <Text style={[styles.sizeText, { color: subColor }]}>
                            {formatBytes(bookSize)}
                        </Text>
                    )}

                    {/* Saving progress */}
                    {isSaving && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${saveProgress}%` }]} />
                            <Text style={styles.progressText}>{saveStatus}</Text>
                        </View>
                    )}
                </View>

                {/* Action buttons (Right side) */}
                <View style={styles.actions}>
                    {isSaving ? (
                        <ActivityIndicator size="small" color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                    ) : isSaved ? (
                        <TouchableOpacity
                            onPress={() => handleRemoveBook(item)}
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor: isPhotoBg ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.14)',
                                    borderColor: isPhotoBg ? 'rgba(16,185,129,0.46)' : 'rgba(16,185,129,0.24)',
                                },
                            ]}
                        >
                            <CheckCircle size={22} color={isPhotoBg ? '#A7F3D0' : '#10B981'} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => handleSaveBook(item)}
                            style={[styles.actionButton, { backgroundColor: actionBg, borderColor: actionBorder }]}
                        >
                            <Download size={22} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
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
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    headerChip: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 6,
    },
    headerChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    list: {
        padding: 16,
        paddingTop: 12,
        paddingBottom: 22,
    },
    card: {
        flexDirection: 'row',
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
        marginBottom: 14,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.14,
                shadowRadius: 9,
                shadowOffset: { width: 0, height: 5 },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    savedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 21,
    },
    sizeText: {
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
    progressContainer: {
        marginTop: 6,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.26)',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#10B981',
        borderRadius: 8,
    },
    progressText: {
        fontSize: 10,
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 4,
        fontWeight: '600',
    },
    actions: {
        marginLeft: 8,
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
