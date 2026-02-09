import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    Switch,
    ActivityIndicator,
    Alert,
    ScrollView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, MinusCircle, UtensilsCrossed } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Dish, CafeCategory } from '../../../types/cafe';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

type RouteParams = {
    StaffStopList: {
        cafeId: number;
        cafeName: string;
    };
};

const StaffStopListScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'StaffStopList'>>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const { cafeId, cafeName } = route.params;
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [dishes, setDishes] = useState<Dish[]>([]);
    const [categories, setCategories] = useState<CafeCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [showStopOnly, setShowStopOnly] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Map<number, boolean>>(new Map());

    useEffect(() => {
        loadData();
    }, [cafeId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const menuData = await cafeService.getMenu(cafeId);

            // Flatten dishes from categories
            const allDishes: Dish[] = [];
            menuData.categories.forEach((cat: CafeCategory) => {
                if (cat.dishes) {
                    allDishes.push(...cat.dishes);
                }
            });

            setCategories(menuData.categories);
            setDishes(allDishes);
        } catch (error) {
            console.error('Error loading menu:', error);
            Alert.alert(t('common.error'), t('cafe.staff.stopList.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const toggleDishAvailability = (dish: Dish) => {
        const currentValue = pendingChanges.has(dish.id)
            ? pendingChanges.get(dish.id)!
            : dish.isAvailable;

        const newChanges = new Map(pendingChanges);
        newChanges.set(dish.id, !currentValue);
        setPendingChanges(newChanges);
    };

    const getDishAvailability = (dish: Dish): boolean => {
        return pendingChanges.has(dish.id)
            ? pendingChanges.get(dish.id)!
            : dish.isAvailable;
    };

    const hasChanges = pendingChanges.size > 0;

    const handleSaveChanges = async () => {
        if (!hasChanges) return;

        try {
            setSaving(true);

            // Group changes by availability
            const toDisable: number[] = [];
            const toEnable: number[] = [];

            pendingChanges.forEach((isAvailable, dishId) => {
                const dish = dishes.find(d => d.id === dishId);
                if (dish && dish.isAvailable !== isAvailable) {
                    if (isAvailable) {
                        toEnable.push(dishId);
                    } else {
                        toDisable.push(dishId);
                    }
                }
            });

            if (toDisable.length > 0) {
                await cafeService.updateStopList(cafeId, toDisable, false);
            }
            if (toEnable.length > 0) {
                await cafeService.updateStopList(cafeId, toEnable, true);
            }

            // Reload data
            await loadData();
            setPendingChanges(new Map());
            Alert.alert(t('common.success'), t('cafe.staff.stopList.saveSuccess'));
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.staff.stopList.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleCancelChanges = () => {
        setPendingChanges(new Map());
    };

    const filteredDishes = dishes.filter(dish => {
        // Category filter
        if (selectedCategory && dish.categoryId !== selectedCategory) return false;

        // Stop list filter
        if (showStopOnly && getDishAvailability(dish)) return false;

        // Search filter
        if (search) {
            return dish.name.toLowerCase().includes(search.toLowerCase());
        }

        return true;
    });

    const stopListCount = dishes.filter(d => !getDishAvailability(d)).length;

    const renderDishItem = ({ item: dish }: { item: Dish }) => {
        const isAvailable = getDishAvailability(dish);
        const hasChange = pendingChanges.has(dish.id);

        return (
            <View style={[
                styles.dishItem,
                !isAvailable && styles.dishItemUnavailable,
                hasChange && styles.dishItemChanged,
            ]}>
                {dish.imageUrl && (
                    <Image source={{ uri: dish.imageUrl }} style={styles.dishImage} />
                )}
                <View style={styles.dishInfo}>
                    <Text style={[
                        styles.dishName,
                        !isAvailable && styles.dishNameUnavailable,
                    ]}>
                        {dish.name}
                    </Text>
                    <Text style={styles.dishCategory}>
                        {categories.find(c => c.id === dish.categoryId)?.name}
                    </Text>
                    <Text style={styles.dishPrice}>{dish.price} ₽</Text>
                </View>
                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>
                        {isAvailable ? t('cafe.staff.stopList.available') : t('cafe.staff.stopList.unavailable')}
                    </Text>
                    <Switch
                        value={isAvailable}
                        onValueChange={() => toggleDishAvailability(dish)}
                        trackColor={{ false: colors.danger, true: colors.success }}
                        thumbColor={colors.textPrimary}
                    />
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{t('cafe.staff.stopList.title')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t('cafe.staff.stopList.positionsUnavailable', { count: stopListCount })}
                    </Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Search size={20} color={colors.textSecondary} strokeWidth={1.5} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('cafe.staff.stopList.searchPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedCategory === null && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedCategory(null)}
                    >
                        <Text style={[
                            styles.filterButtonText,
                            selectedCategory === null && styles.filterButtonTextActive,
                        ]}>
                            {t('cafe.staff.stopList.all')}
                        </Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.filterButton,
                                selectedCategory === cat.id && styles.filterButtonActive,
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[
                                styles.filterButtonText,
                                selectedCategory === cat.id && styles.filterButtonTextActive,
                            ]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity
                    style={[
                        styles.stopOnlyButton,
                        showStopOnly && styles.stopOnlyButtonActive,
                    ]}
                    onPress={() => setShowStopOnly(!showStopOnly)}
                >
                    <MinusCircle
                        size={16}
                        color={showStopOnly ? colors.textPrimary : colors.danger}
                        strokeWidth={1.5}
                    />
                    <Text style={[
                        styles.stopOnlyText,
                        showStopOnly && styles.stopOnlyTextActive,
                    ]}>
                        {t('cafe.staff.stopList.onlyStop')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Dishes list */}
            <FlatList
                data={filteredDishes}
                renderItem={renderDishItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <UtensilsCrossed size={48} color={colors.textSecondary} strokeWidth={1} />
                        <Text style={styles.emptyText}>{t('cafe.staff.stopList.noDishes')}</Text>
                    </View>
                }
            />

            {/* Save bar */}
            {hasChanges && (
                <View style={styles.saveBar}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancelChanges}
                    >
                        <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSaveChanges}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={colors.textPrimary} size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>
                                {t('cafe.staff.stopList.save', { count: pendingChanges.size })}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 48,
        backgroundColor: colors.surfaceElevated,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    headerSubtitle: {
        color: colors.danger,
        fontSize: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        margin: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        height: 40,
        color: colors.textPrimary,
        marginLeft: 8,
    },
    filtersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        marginRight: 8,
    },
    filterButtonActive: {
        backgroundColor: colors.accent,
    },
    filterButtonText: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    filterButtonTextActive: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    stopOnlyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.accentSoft,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.danger,
    },
    stopOnlyButtonActive: {
        backgroundColor: colors.danger,
        borderColor: colors.danger,
    },
    stopOnlyText: {
        color: colors.danger,
        fontSize: 12,
    },
    stopOnlyTextActive: {
        color: colors.textPrimary,
    },
    listContent: {
        padding: 12,
    },
    dishItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    dishItemUnavailable: {
        backgroundColor: colors.accentSoft,
        borderWidth: 1,
        borderColor: colors.danger,
    },
    dishItemChanged: {
        borderWidth: 2,
        borderColor: colors.accent,
    },
    dishImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        marginRight: 12,
    },
    dishInfo: {
        flex: 1,
    },
    dishName: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '500',
    },
    dishNameUnavailable: {
        color: colors.danger,
        textDecorationLine: 'line-through',
    },
    dishCategory: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    dishPrice: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    switchContainer: {
        alignItems: 'center',
        marginLeft: 12,
    },
    switchLabel: {
        color: colors.textSecondary,
        fontSize: 10,
        marginBottom: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 48,
    },
    emptyText: {
        color: colors.textSecondary,
        marginTop: 12,
    },
    saveBar: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 32,
        backgroundColor: colors.surfaceElevated,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.textPrimary,
        fontSize: 15,
    },
    saveButton: {
        flex: 2,
        backgroundColor: colors.accent,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
});

export default StaffStopListScreen;
