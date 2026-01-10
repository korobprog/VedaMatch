import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { libraryService } from '../../services/libraryService';
import { ScriptureBook } from '../../types/library';

// Mock categories for now based on the image
const CATEGORIES = [
    { id: 'scriptures', title: 'Священные писания', description: 'Основополагающее философское произведение ведической мудрости', icon: '📚' },
    { id: 'puranas', title: 'Пураны', description: 'Энциклопедия ведической философии', icon: '🕉️' },
    { id: 'practice', title: 'Практика', description: 'Практическое руководство по развитию любви к Богу', icon: '🙏' },
    { id: 'culture', title: 'Культура', description: 'Принципы поведения и общения', icon: '🤝' },
];

export const LibraryHomeScreen = () => {
    const navigation = useNavigation<any>();
    const [books, setBooks] = useState<ScriptureBook[]>([]);

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            const data = await libraryService.getBooks();
            setBooks(data);
        } catch (error) {
            console.error('Failed to load books', error);
        }
    };

    const handleCategoryPress = (category: any) => {
        // For now, simplify logic: if category is 'scriptures', show BG.
        // We will navigate to a BookList screen filtering by category, or just show list.
        navigation.navigate('BookList', { category: category.id, title: category.title });
    };

    const handleBookPress = (book: ScriptureBook) => {
        navigation.navigate('BookReader', { bookCode: book.code, title: book.name_ru || book.name_en });
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.categories}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={styles.card}
                        onPress={() => handleCategoryPress(cat)}
                    >
                        <View style={styles.iconContainer}>
                            <Text style={{ fontSize: 30 }}>{cat.icon}</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.categoryLabel}>{cat.title.toUpperCase()}</Text>
                            <Text style={styles.cardTitle}>{cat.title === 'Священные писания' ? 'Бхагавад-гита как она есть' : cat.title === 'Пураны' ? 'Шримад-Бхагаватам' : cat.title}</Text>
                            <Text style={styles.cardDescription} numberOfLines={3}>{cat.description}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA', // Light background
    },
    header: {
        padding: 20,
        paddingTop: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    categories: {
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
    categoryLabel: {
        fontSize: 12,
        color: '#BCAAA4', // Muted brownish
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
});
