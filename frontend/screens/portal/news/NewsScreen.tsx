import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    useColorScheme,
    TouchableOpacity,
    Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';

interface NewsItem {
    id: string;
    title: string;
    summary: string;
    date: string;
    image?: string;
}

const MOCK_NEWS: NewsItem[] = [
    {
        id: '1',
        title: 'Vedic Wisdom for Modern Times',
        summary: 'Explore how ancient knowledge can help navigate today\'s challenges with clarity and peace.',
        date: 'Oct 24, 2023',
        image: 'https://via.placeholder.com/150'
    },
    {
        id: '2',
        title: 'New Yoga Center Opens in Rishikesh',
        summary: 'A new Sanctuary for practitioners has opened its doors, offering traditional Hatha yoga.',
        date: 'Oct 22, 2023',
    },
    {
        id: '3',
        title: 'The Benefits of Sattvic Diet',
        summary: 'Learn why a pure vegetarian diet is essential for spiritual growth and physical health.',
        date: 'Oct 20, 2023',
        image: 'https://via.placeholder.com/150'
    }
];

export const NewsScreen = () => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const renderNewsItem = ({ item }: { item: NewsItem }) => (
        <TouchableOpacity style={[styles.card, { backgroundColor: theme.header, borderColor: theme.borderColor }]}>
            {item.image && (
                <View style={[styles.imagePlaceholder, { backgroundColor: theme.background }]}>
                    <Text style={{ fontSize: 40 }}>📰</Text>
                </View>
            )}
            <View style={styles.cardContent}>
                <Text style={[styles.date, { color: theme.subText }]}>{item.date}</Text>
                <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.summary, { color: theme.subText }]} numberOfLines={2}>
                    {item.summary}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={MOCK_NEWS}
                keyExtractor={(item) => item.id}
                renderItem={renderNewsItem}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        padding: 16,
    },
    card: {
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    imagePlaceholder: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        padding: 16,
    },
    date: {
        fontSize: 12,
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    summary: {
        fontSize: 14,
        lineHeight: 20,
    }
});
