import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { libraryService } from '../../services/libraryService';
import { ScriptureBook } from '../../types/library';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';
import { Book } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';

export const LibraryHomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { vTheme, isDarkMode } = useSettings();
    const [books, setBooks] = useState<ScriptureBook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            setLoading(true);
            const data = await libraryService.getBooks();
            setBooks(data);
        } catch (error) {
            console.error('Failed to load books', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookPress = (book: ScriptureBook) => {
        navigation.navigate('Reader', { bookCode: book.code, title: book.name_ru || book.name_en });
    };

    const renderBookItem = ({ item }: { item: ScriptureBook }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: vTheme.colors.surface }]}
            onPress={() => handleBookPress(item)}
        >
            <View style={[styles.iconContainer, { backgroundColor: vTheme.colors.primary + '10' }]}>
                <Book size={32} color={vTheme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.cardTitle, { color: vTheme.colors.text }]}>{item.name_ru || item.name_en}</Text>
                <Text style={[styles.cardDescription, { color: vTheme.colors.textSecondary }]} numberOfLines={3}>{item.description_ru || item.description_en}</Text>
            </View>
        </TouchableOpacity>
    );

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
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
        marginBottom: 6,
        fontFamily: 'Playfair Display',
    },
    cardDescription: {
        fontSize: 13,
        color: ModernVedicTheme.colors.textSecondary,
        lineHeight: 20,
    },
});
