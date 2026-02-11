import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    FlatList,
    TextInput,
    Switch,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Plus,
    Edit2,
    Trash2,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    UtensilsCrossed,
    Search,
    Filter,
    X,
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import {
    CafeCategory,
    Dish,
} from '../../../types/cafe';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const StaffMenuEditorScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'StaffMenuEditor'>>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const { cafeId, cafeName } = route.params;
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [categories, setCategories] = useState<CafeCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

    // Modals State
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [dishModalVisible, setDishModalVisible] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [newDish, setNewDish] = useState({
        name: '',
        price: '',
        description: '',
    });
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const actionLocksRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        void loadMenu();
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            actionLocksRef.current.clear();
        };
    }, [cafeId]);

    const loadMenu = useCallback(async () => {
        if (!cafeId) {
            console.error('[StaffMenuEditor] No cafeId provided');
            return;
        }
        const requestId = ++latestLoadRequestRef.current;

        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            console.log(`[StaffMenuEditor] Loading menu for cafe ${cafeId}...`);
            const data = await cafeService.getMenu(cafeId);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.log('[StaffMenuEditor] Menu data received:', data);

            const categoriesData = data.categories || [];
            setCategories(categoriesData);

            // Expand all by default
            const initialExpanded: Record<number, boolean> = {};
            categoriesData.forEach(cat => {
                if (cat.id) {
                    initialExpanded[cat.id] = true;
                }
            });
            setExpandedCategories(initialExpanded);
        } catch (error: any) {
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.error('Error loading menu:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            Alert.alert(t('common.error'), t('cafe.menu.loadError'));
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [cafeId, t]);

    const toggleCategory = (id: number) => {
        setExpandedCategories(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleToggleDishAvailability = async (dish: Dish) => {
        const lockKey = `availability:${dish.id}`;
        if (actionLocksRef.current.has(lockKey)) {
            return;
        }
        actionLocksRef.current.add(lockKey);
        try {
            const updatedDish = { ...dish, isAvailable: !dish.isAvailable };
            await cafeService.updateDish(cafeId, dish.id, { isAvailable: updatedDish.isAvailable });

            // Update local state
            setCategories(prev => prev.map(cat => ({
                ...cat,
                dishes: cat.dishes?.map(d => d.id === dish.id ? updatedDish : d)
            })));
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.menu.updateError'));
        } finally {
            actionLocksRef.current.delete(lockKey);
        }
    };

    const handleDeleteDish = (dish: Dish) => {
        Alert.alert(
            t('common.confirm'),
            t('cafe.menu.deleteDishConfirm', { name: dish.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const lockKey = `delete:${dish.id}`;
                        if (actionLocksRef.current.has(lockKey)) {
                            return;
                        }
                        actionLocksRef.current.add(lockKey);
                        try {
                            await cafeService.deleteDish(cafeId, dish.id);
                            await loadMenu();
                        } catch (error) {
                            Alert.alert(t('common.error'), t('cafe.menu.deleteError'));
                        } finally {
                            actionLocksRef.current.delete(lockKey);
                        }
                    }
                }
            ]
        );
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert(t('common.error'), t('cafe.menu.errorCategoryName'));
            return;
        }
        const lockKey = 'create-category';
        if (actionLocksRef.current.has(lockKey)) {
            return;
        }
        actionLocksRef.current.add(lockKey);

        try {
            await cafeService.createCategory(cafeId, { name: newCategoryName });
            setNewCategoryName('');
            setCategoryModalVisible(false);
            await loadMenu();
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.menu.updateError'));
        } finally {
            actionLocksRef.current.delete(lockKey);
        }
    };

    const handleAddDish = async () => {
        if (!newDish.name.trim() || !newDish.price.trim()) {
            Alert.alert(t('common.error'), t('cafe.menu.errorDishFields'));
            return;
        }

        if (!selectedCategoryId) {
            Alert.alert(t('common.error'), t('cafe.menu.loadError'));
            return;
        }
        const parsedPrice = Number.parseFloat(newDish.price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            Alert.alert(t('common.error'), t('cafe.menu.errorDishFields'));
            return;
        }
        const lockKey = `create-dish:${selectedCategoryId}`;
        if (actionLocksRef.current.has(lockKey)) {
            return;
        }
        actionLocksRef.current.add(lockKey);

        try {
            await cafeService.createDish(cafeId, {
                name: newDish.name,
                price: parsedPrice,
                description: newDish.description,
                categoryId: selectedCategoryId,
                isAvailable: true,
            });
            setNewDish({ name: '', price: '', description: '' });
            setDishModalVisible(false);
            await loadMenu();
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.menu.updateError'));
        } finally {
            actionLocksRef.current.delete(lockKey);
        }
    };

    const filteredCategories = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return categories;
        }
        return categories
            .map((category) => ({
                ...category,
                dishes: (category.dishes || []).filter((dish) =>
                    dish.name.toLowerCase().includes(query) ||
                    (dish.description || '').toLowerCase().includes(query)
                ),
            }))
            .filter((category) =>
                category.name.toLowerCase().includes(query) ||
                (category.dishes && category.dishes.length > 0)
            );
    }, [categories, searchQuery]);

    const renderDishItem = ({ item: dish }: { item: Dish }) => (
        <View style={styles.dishCard}>
            <TouchableOpacity
                style={styles.dishImageContainer}
                onPress={() => navigation.navigate('DishDetail', { cafeId, dishId: dish.id, cafeName })}
            >
                <Image
                    source={{ uri: cafeService.getImageUrl(dish.imageUrl) }}
                    style={styles.dishImage}
                />
            </TouchableOpacity>
            <View style={styles.dishInfo}>
                <Text style={styles.dishName}>{dish.name}</Text>
                <Text style={styles.dishPrice}>{dish.price} ₽</Text>
            </View>
            <View style={styles.dishActions}>
                <Switch
                    value={dish.isAvailable}
                    onValueChange={() => handleToggleDishAvailability(dish)}
                    trackColor={{ false: colors.border, true: colors.success }}
                    thumbColor={colors.surfaceElevated}
                />
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('DishDetail', { cafeId, dishId: dish.id, cafeName })}
                >
                    <Edit2 size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDeleteDish(dish)}
                >
                    <Trash2 size={20} color={colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

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
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{t('cafe.dashboard.menu')}</Text>
                    <Text style={styles.headerSubtitle}>{cafeName}</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        if (categories.length > 0) {
                            setSelectedCategoryId(categories[0].id);
                            setDishModalVisible(true);
                        } else {
                            setCategoryModalVisible(true);
                        }
                    }}
                >
                    <Plus size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('common.search')}
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Filter size={20} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {filteredCategories.map((category, index) => (
                    <View key={`cat-${category.id || index}`} style={styles.categorySection}>
                        <TouchableOpacity
                            style={styles.categoryHeader}
                            onPress={() => toggleCategory(category.id)}
                        >
                            <View style={styles.categoryTitleGroup}>
                                <Text style={styles.categoryName}>{category.name}</Text>
                                <Text style={styles.categoryCount}>
                                    {category.dishes?.length || 0}
                                </Text>
                            </View>
                            {expandedCategories[category.id] ? (
                                <ChevronUp size={24} color={colors.textSecondary} />
                            ) : (
                                <ChevronDown size={24} color={colors.textSecondary} />
                            )}
                        </TouchableOpacity>

                        {expandedCategories[category.id] && (
                            <View style={styles.dishesList}>
                                {category.dishes?.map((dish, dishIndex) => (
                                    <View key={`dish-${dish.id || dishIndex}`}>
                                        {renderDishItem({ item: dish })}
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={styles.addDishSmall}
                                    onPress={() => {
                                        setSelectedCategoryId(category.id);
                                        setDishModalVisible(true);
                                    }}
                                >
                                    <Plus size={18} color={colors.accent} />
                                    <Text style={styles.addDishText}>{t('cafe.menu.addDish')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addCategoryButton}
                    onPress={() => setCategoryModalVisible(true)}
                >
                    <Plus size={24} color={colors.textPrimary} />
                    <Text style={styles.addCategoryText}>{t('cafe.menu.addCategory')}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Category Modal */}
            <Modal
                visible={categoryModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCategoryModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setCategoryModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('cafe.menu.addCategory')}</Text>
                                <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                                    <X size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.modalInput}
                                placeholder={t('cafe.settings.name')}
                                placeholderTextColor={colors.textSecondary}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={handleAddCategory}
                            >
                                <Text style={styles.modalButtonText}>{t('common.save')}</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>

            {/* Add Dish Modal */}
            <Modal
                visible={dishModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDishModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setDishModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('cafe.menu.addDish')}</Text>
                                <TouchableOpacity onPress={() => setDishModalVisible(false)}>
                                    <X size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder={t('cafe.dish.name')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={newDish.name}
                                    onChangeText={(text) => setNewDish(prev => ({ ...prev, name: text }))}
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder={t('market.price')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={newDish.price}
                                    onChangeText={(text) => setNewDish(prev => ({ ...prev, price: text }))}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                                    placeholder={t('market.description')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={newDish.description}
                                    onChangeText={(text) => setNewDish(prev => ({ ...prev, description: text }))}
                                    multiline
                                />
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={handleAddDish}
                                >
                                    <Text style={styles.modalButtonText}>{t('common.save')}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>
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
        paddingTop: 48,
        paddingBottom: 20,
        paddingHorizontal: 16,
        backgroundColor: colors.surfaceElevated,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchSection: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        marginLeft: 8,
        fontSize: 16,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    categorySection: {
        marginBottom: 8,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: colors.surfaceElevated,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    categoryTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryName: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    categoryCount: {
        color: colors.textSecondary,
        fontSize: 14,
        backgroundColor: colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    dishesList: {
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
    },
    dishCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dishImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: colors.surfaceElevated,
        overflow: 'hidden',
    },
    dishImage: {
        width: '100%',
        height: '100%',
    },
    dishInfo: {
        flex: 1,
        marginLeft: 12,
    },
    dishName: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    dishPrice: {
        color: colors.accent,
        fontSize: 15,
        fontWeight: 'bold',
        marginTop: 4,
    },
    dishActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
    },
    addDishSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 6,
    },
    addDishText: {
        color: colors.accent,
        fontSize: 15,
        fontWeight: '500',
    },
    addCategoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
        margin: 16,
        padding: 16,
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    addCategoryText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
    },
    modalCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalInput: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 14,
        color: colors.textPrimary,
        fontSize: 16,
        marginBottom: 16,
    },
    modalButton: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    modalButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default StaffMenuEditorScreen;
