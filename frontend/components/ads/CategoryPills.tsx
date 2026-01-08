import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModernVedicTheme as vedicTheme } from '../../theme/ModernVedicTheme';
import { AdCategory } from '../../types/ads';

export const CATEGORIES: { id: AdCategory | 'all', emoji: string }[] = [
    { id: 'all', emoji: '🔥' },
    { id: 'yoga_wellness', emoji: '🧘' },
    { id: 'ayurveda', emoji: '🌿' },
    { id: 'goods', emoji: '📦' },
    { id: 'services', emoji: '🛠️' },
    { id: 'housing', emoji: '🏠' },
    { id: 'furniture', emoji: '🪑' },
    { id: 'spiritual', emoji: '🕉️' },
    { id: 'education', emoji: '📚' },
    { id: 'events', emoji: '🎭' },
    { id: 'charity', emoji: '💝' },
];

interface CategoryPillsProps {
    selectedCategory: AdCategory | 'all';
    onSelectCategory: (category: AdCategory | 'all') => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({ selectedCategory, onSelectCategory }) => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            style={styles.scrollView}
        >
            {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.pill,
                            {
                                backgroundColor: isSelected ? colors.primary : (isDarkMode ? '#333' : '#fff'),
                                borderColor: isSelected ? colors.primary : colors.textSecondary,
                                borderWidth: 1
                            }
                        ]}
                        onPress={() => onSelectCategory(cat.id)}
                    >
                        <Text style={styles.emoji}>{cat.emoji}</Text>
                        <Text
                            style={[
                                styles.label,
                                { color: isSelected ? '#fff' : (isDarkMode ? '#ddd' : colors.text) }
                            ]}
                        >
                            {t(`ads.categories.${cat.id}`)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        maxHeight: 60,
    },
    container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    emoji: {
        fontSize: 16,
        marginRight: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
});
