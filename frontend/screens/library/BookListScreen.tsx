import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { libraryService } from '../../services/libraryService';
import { ScriptureBook } from '../../types/library';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';

export const BookListScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { category, title } = route.params;
    const { vTheme, isDarkMode } = useSettings();
    const { t } = useTranslation();
    const [books, setBooks] = useState<ScriptureBook[]>([]);

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            // For now, we fetch all books. Real implementation might filter by 'category' if backend supports it.
            // Since we only have 'bg', we'll just show what we have.
            const data = await libraryService.getBooks();
            setBooks(data);
        } catch (error) {
            console.error('Failed to load books', error);
        }
    };

    const renderItem = ({ item }: { item: ScriptureBook }) => (
        <TouchableOpacity
            style={[styles.item, { backgroundColor: vTheme.colors.surface }]}
            onPress={() => navigation.navigate('Reader', { bookCode: item.code, title: item.name_ru || item.name_en })}
        >
            <View>
                <Text style={[styles.title, { color: vTheme.colors.text }]}>{item.name_ru || item.name_en}</Text>
                <Text style={[styles.subtitle, { color: vTheme.colors.textSecondary }]}>{item.description_ru || item.description_en}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <FlatList
                data={books}
                renderItem={renderItem}
                keyExtractor={(item) => item.code}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    list: {
        padding: 16,
    },
    item: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
});
