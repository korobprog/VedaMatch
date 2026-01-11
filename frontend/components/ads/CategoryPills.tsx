import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, useColorScheme } from 'react-native';
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

const AnimatedPill: React.FC<{
    isActive: boolean;
    onPress: () => void;
    children: React.ReactNode;
    style?: any;
}> = ({ isActive, onPress, children, style }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={{ marginRight: 10 }}
        >
            <Animated.View style={[style, { transform: [{ scale: scaleAnim }], marginRight: 0 }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

export const CategoryPills: React.FC<CategoryPillsProps> = ({ selectedCategory, onSelectCategory }) => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    return (
        <View style={styles.wrapper}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.container}
                style={styles.scrollView}
            >
                {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                        <AnimatedPill
                            key={cat.id}
                            isActive={isSelected}
                            onPress={() => onSelectCategory(cat.id)}
                            style={[
                                styles.pill,
                                {
                                    backgroundColor: isSelected ? colors.primary : (isDarkMode ? '#333' : '#fff'),
                                    borderColor: isSelected ? colors.primary : colors.textSecondary,
                                    borderWidth: 1
                                }
                            ]}
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
                        </AnimatedPill>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        // Wrapper to ensure isolation from other components if needed
        zIndex: 10,
        marginBottom: 8,
    },
    scrollView: {
        // Removed maxHeight to prevent squeezing
    },
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        // marginRight is handled by Pressable wrapper
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
