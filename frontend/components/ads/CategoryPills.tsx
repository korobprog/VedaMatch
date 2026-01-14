import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModernVedicTheme as vedicTheme } from '../../theme/ModernVedicTheme';
import { AdCategory } from '../../types/ads';
import {
    Flame,
    Wind,
    Leaf,
    Package,
    Wrench,
    Home,
    Armchair,
    Sun,
    BookOpen,
    Tickets,
    Heart,
    HandHelping
} from 'lucide-react-native';

const getCategoryIcon = (id: AdCategory | 'all', color: string, size: number = 18) => {
    switch (id) {
        case 'all': return <Flame size={size} color={color} />;
        case 'yoga_wellness': return <Wind size={size} color={color} />;
        case 'ayurveda': return <Leaf size={size} color={color} />;
        case 'goods': return <Package size={size} color={color} />;
        case 'services': return <Wrench size={size} color={color} />;
        case 'housing': return <Home size={size} color={color} />;
        case 'furniture': return <Armchair size={size} color={color} />;
        case 'spiritual': return <Sun size={size} color={color} />;
        case 'education': return <BookOpen size={size} color={color} />;
        case 'events': return <Tickets size={size} color={color} />;
        case 'charity': return <HandHelping size={size} color={color} />;
        default: return <Package size={size} color={color} />;
    }
};

export const CATEGORIES: { id: AdCategory | 'all' }[] = [
    { id: 'all' },
    { id: 'yoga_wellness' },
    { id: 'ayurveda' },
    { id: 'goods' },
    { id: 'services' },
    { id: 'housing' },
    { id: 'furniture' },
    { id: 'spiritual' },
    { id: 'education' },
    { id: 'events' },
    { id: 'charity' },
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
                            <View style={{ marginRight: 6 }}>
                                {getCategoryIcon(cat.id, isSelected ? '#fff' : colors.primary)}
                            </View>
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
