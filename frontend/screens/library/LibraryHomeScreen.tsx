import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { libraryService } from '../../services/libraryService';
import { offlineBookService, formatBytes, SavedBookInfo } from '../../services/offlineBookService';
import { ScriptureBook } from '../../types/library';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';
import { Book, Download, CheckCircle } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';

export const LibraryHomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { vTheme, isDarkMode } = useSettings();
    const { t } = useTranslation();
    const [books, setBooks] = useState<ScriptureBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [savedBooks, setSavedBooks] = useState<string[]>([]);
    const [bookSizes, setBookSizes] = useState<{ [code: string]: number }>({});
    const [savingBook, setSavingBook] = useState<string | null>(null);
    const [saveProgress, setSaveProgress] = useState<number>(0);
    const [saveStatus, setSaveStatus] = useState<string>('');

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

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: vTheme.colors.surface }]}
                onPress={() => handleBookPress(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
            >

                {/* Book icon */}
                <View style={[styles.iconContainer, { backgroundColor: vTheme.colors.primary + '10' }]}>
                    <Book size={32} color={vTheme.colors.primary} />
                </View>

                {/* Book info */}
                <View style={styles.textContainer}>
                    <Text
                        style={[styles.cardTitle, { color: vTheme.colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.name_ru || item.name_en}
                    </Text>
                    <Text
                        style={[styles.cardDescription, { color: vTheme.colors.textSecondary }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {item.description_ru || item.description_en || t('library.scripture', 'Священное писание')}
                    </Text>

                    {/* Size info */}
                    {bookSize && (
                        <Text style={[styles.sizeText, { color: vTheme.colors.textSecondary }]}>
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
                        <ActivityIndicator size="small" color={vTheme.colors.primary} />
                    ) : isSaved ? (
                        <TouchableOpacity
                            onPress={() => handleRemoveBook(item)}
                            style={[styles.actionButton, { backgroundColor: '#4CAF5015' }]}
                        >
                            <CheckCircle size={22} color="#4CAF50" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => handleSaveBook(item)}
                            style={[styles.actionButton, { backgroundColor: vTheme.colors.primary + '15' }]}
                        >
                            <Download size={22} color={vTheme.colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: vTheme.colors.background }]}>
                <ActivityIndicator size="large" color={vTheme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <FlatList<ScriptureBook>
                data={books}
                renderItem={renderBookItem}
                keyExtractor={(item: ScriptureBook) => item.code}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ModernVedicTheme.colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        alignItems: 'center',
        position: 'relative',
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
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        color: ModernVedicTheme.colors.textSecondary,
        lineHeight: 18,
    },
    sizeText: {
        fontSize: 11,
        marginTop: 4,
        opacity: 0.7,
    },
    progressContainer: {
        marginTop: 6,
        height: 20,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 10,
        color: '#333',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 4,
    },
    actions: {
        marginLeft: 8,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
