import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    useColorScheme,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';

interface KnowledgeItem {
    id: string;
    title: string;
    category: string;
    summary: string;
    icon: string;
}

const MOCK_KNOWLEDGE: KnowledgeItem[] = [
    {
        id: '1',
        title: 'Библиотека',
        category: 'Священные Писания',
        summary: 'Основополагающее философское произведение ведической мудрости, беседа Кришны и Арджуны.',
        icon: '📚'
    }
];

export const KnowledgeBaseScreen = () => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const renderItem = ({ item }: { item: KnowledgeItem }) => (
        <TouchableOpacity style={[styles.card, { backgroundColor: theme.header, borderColor: theme.borderColor }]}>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.category, { color: theme.accent }]}>{item.category}</Text>
                <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.summary, { color: theme.subText }]} numberOfLines={3}>
                    {item.summary}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={MOCK_KNOWLEDGE}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListHeaderComponent={() => (
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Библиотека мудрости</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.subText }]}>
                            Изучайте священные тексты и философию
                        </Text>
                    </View>
                )}
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
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
    },
    card: {
        flexDirection: 'row',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        padding: 16,
        alignItems: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    icon: {
        fontSize: 30,
    },
    cardContent: {
        flex: 1,
    },
    category: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    summary: {
        fontSize: 13,
        lineHeight: 18,
    }
});
