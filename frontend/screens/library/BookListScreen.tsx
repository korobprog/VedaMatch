import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
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
            style={[
                styles.item,
                {
                    backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : roleColors.surfaceElevated,
                    borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : roleColors.border,
                },
            ]}
            onPress={() => navigation.navigate('Reader', { bookCode: item.code, title: item.name_ru || item.name_en })}
            activeOpacity={0.86}
        >
            {(isPhotoBg || isDarkMode) && (
                <BlurView
                    style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={12}
                    reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.65)' : roleColors.surfaceElevated}
                />
            )}
            <View style={[styles.iconWrap, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.accentSoft, borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : roleColors.border }]}>
                <BookOpenText size={22} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
            </View>
            <View style={styles.textWrap}>
                <Text style={[styles.title, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]} numberOfLines={1}>{item.name_ru || item.name_en}</Text>
                <Text style={[styles.subtitle, { color: isPhotoBg ? 'rgba(255,255,255,0.82)' : roleColors.textSecondary }]} numberOfLines={2}>
                    {item.description_ru || item.description_en}
                </Text>
            </View>
            <View style={[styles.chevronWrap, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border, backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft }]}>
                <ChevronRight size={16} color={isPhotoBg ? '#FFFFFF' : roleColors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

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
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 14,
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    iconWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textWrap: {
        flex: 1,
        paddingRight: 10,
    },
    chevronWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
        lineHeight: 20,
    },
});
