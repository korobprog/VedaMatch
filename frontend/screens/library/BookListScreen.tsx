import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Animated } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { libraryService } from '../../services/libraryService';
import { ScriptureBook } from '../../types/library';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { BookOpenText, ChevronRight } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

export const BookListScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { category } = route.params;
    const { isDarkMode, portalBackgroundType } = useSettings();
    const { user } = useUser();
    const { t } = useTranslation();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const [books, setBooks] = useState<ScriptureBook[]>([]);
    const isPhotoBg = portalBackgroundType === 'image';

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

    const renderItem = ({ item, index }: { item: ScriptureBook, index: number }) => {
        const titleColor = isPhotoBg ? '#FFFFFF' : roleColors.textPrimary;
        const subColor = isPhotoBg ? 'rgba(255,255,255,0.7)' : roleColors.textSecondary;
        const cardBackground = isPhotoBg
            ? 'rgba(255,255,255,0.12)'
            : (isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.82)');
        const cardBorder = isPhotoBg
            ? 'rgba(255,255,255,0.22)'
            : roleColors.border;
        const accentColor = roleColors.accent;

        // Entrance animation
        const translateY = useRef(new Animated.Value(20)).current;
        const opacity = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 400,
                    delay: index * 80,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    delay: index * 80,
                    useNativeDriver: true,
                })
            ]).start();
        }, []);

        return (
            <Animated.View style={{ transform: [{ translateY }], opacity }}>
                <TouchableOpacity
                    style={[styles.item, { backgroundColor: cardBackground, borderColor: cardBorder }]}
                    onPress={() => navigation.navigate('Reader', { bookCode: item.code, title: item.name_ru || item.name_en })}
                    activeOpacity={0.8}
                >
                    {(isPhotoBg || isDarkMode) && (
                        <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType={isDarkMode ? 'dark' : 'light'}
                            blurAmount={20}
                            reducedTransparencyFallbackColor={roleColors.surfaceElevated}
                        />
                    )}

                    <LinearGradient
                        colors={isDarkMode ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(255,255,255,0.8)', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : roleColors.surfaceElevated, borderColor: cardBorder }]}>
                        <BookOpenText size={20} color={accentColor} />
                    </View>

                    <View style={styles.textWrap}>
                        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
                            {item.name_ru || item.name_en}
                        </Text>
                        <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={2}>
                            {item.description_ru || item.description_en}
                        </Text>
                    </View>

                    <View style={[styles.chevronWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <ChevronRight size={18} color={roleColors.textSecondary} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isPhotoBg ? 'transparent' : roleColors.background }]}>
            <FlatList
                data={books}
                renderItem={renderItem}
                keyExtractor={(item) => item.code}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
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
        paddingBottom: 40,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 16,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textWrap: {
        flex: 1,
        paddingRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
        lineHeight: 20,
    },
    chevronWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
