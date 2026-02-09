import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Dimensions,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    Utensils,
    X,
    Scale,
    Flame,
    Timer,
    Check,
    Minus,
    Plus,
    Info,
    Leaf,
    Wheat
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Dish, DishModifier, SelectedModifier } from '../../../types/cafe';
import { useCart } from '../../../contexts/CafeCartContext';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const { width } = Dimensions.get('window');

type RouteParams = {
    DishDetail: {
        cafeId: number;
        dishId: number;
        cafeName?: string;
    };
};

const DishDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'DishDetail'>>();
    const { t } = useTranslation();
    const { cafeId, dishId, cafeName } = route.params;
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [dish, setDish] = useState<Dish | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
    const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
    const [note, setNote] = useState('');

    const { addToCart } = useCart();

    useEffect(() => {
        loadDish();
    }, [dishId]);

    const loadDish = async () => {
        try {
            setLoading(true);
            const dishData = await cafeService.getDish(cafeId, dishId);
            setDish(dishData);

            if (dishData.modifiers) {
                const defaults = dishData.modifiers
                    .filter((m: DishModifier) => m.isDefault && m.isAvailable)
                    .map((m: DishModifier) => ({ modifier: m, quantity: 1 }));
                setSelectedModifiers(defaults);
            }
        } catch (error) {
            console.error('Error loading dish:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleIngredient = (ingredientName: string) => {
        setRemovedIngredients(prev =>
            prev.includes(ingredientName)
                ? prev.filter(i => i !== ingredientName)
                : [...prev, ingredientName]
        );
    };

    const toggleModifier = (modifier: DishModifier) => {
        setSelectedModifiers(prev => {
            const existing = prev.find(m => m.modifier.id === modifier.id);
            if (existing) {
                return prev.filter(m => m.modifier.id !== modifier.id);
            } else {
                return [...prev, { modifier, quantity: 1 }];
            }
        });
    };

    const updateModifierQuantity = (modifierId: number, delta: number) => {
        setSelectedModifiers(prev =>
            prev.map(m => {
                if (m.modifier.id === modifierId) {
                    const newQty = Math.max(1, Math.min(m.modifier.maxQuantity || 10, m.quantity + delta));
                    return { ...m, quantity: newQty };
                }
                return m;
            })
        );
    };

    const calculateTotal = (): number => {
        if (!dish) return 0;
        let total = dish.price * quantity;
        selectedModifiers.forEach(m => {
            total += m.modifier.price * m.quantity;
        });
        return total;
    };

    const handleAddToCart = () => {
        if (!dish) return;
        addToCart(dish, quantity, removedIngredients, selectedModifiers, note, cafeId, cafeName);
        navigation.goBack();
    };

    if (loading) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </LinearGradient>
        );
    }

    if (!dish) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <Info size={48} color={colors.textSecondary} />
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t('cafe.dish.notFound')}</Text>
            </LinearGradient>
        );
    }

    const modifierGroups = dish.modifiers?.reduce((acc, mod) => {
        const group = mod.groupName || t('cafe.dish.modifiers');
        if (!acc[group]) acc[group] = [];
        acc[group].push(mod);
        return acc;
    }, {} as Record<string, DishModifier[]>) || {};

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={roleTheme.gradient} style={StyleSheet.absoluteFill} />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.imageWrapper}>
                    {dish.imageUrl ? (
                        <Image source={{ uri: dish.imageUrl }} style={styles.heroImg} />
                    ) : (
                        <View style={styles.heroImgPlaceholder}>
                            <Utensils size={64} color={colors.textSecondary} />
                        </View>
                    )}
                    <LinearGradient
                        colors={[colors.overlay, 'transparent', colors.overlay]}
                        style={StyleSheet.absoluteFill}
                    />
                    <SafeAreaView style={styles.headerControls} edges={['top']}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                            <X size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>

                <View style={styles.contentOverlay}>
                    <View style={styles.dishHeader}>
                        <Text style={[styles.dishName, { color: colors.textPrimary }]}>{dish.name}</Text>
                        <View style={styles.badgesFlow}>
                            {!!dish.isVegetarian && (
                                <View style={styles.badgeGlass}>
                                    <Leaf size={12} color={colors.success} />
                                    <Text style={styles.badgeText}>{t('cafe.dish.vegetarian')}</Text>
                                </View>
                            )}
                            {!!dish.isSpicy && (
                                <View style={[styles.badgeGlass, styles.badgeSpicy, { borderColor: colors.danger }]}>
                                    <Flame size={12} color={colors.danger} />
                                    <Text style={styles.badgeText}>{t('cafe.dish.spicy')}</Text>
                                </View>
                            )}
                            {!!dish.isGlutenFree && (
                                <View style={styles.badgeGlass}>
                                    <Wheat size={12} color={colors.warning} />
                                    <Text style={styles.badgeText}>{t('cafe.dish.glutenFree')}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {!!dish.description && (
                        <Text style={[styles.description, { color: colors.textSecondary }]}>{dish.description}</Text>
                    )}

                    <View style={styles.metaStrip}>
                        {!!dish.weight && dish.weight > 0 && (
                            <View style={styles.metaPill}>
                                <Scale size={14} color={colors.textSecondary} />
                                <Text style={styles.metaPillText}>{dish.weight} {t('cafe.dish.weight')}</Text>
                            </View>
                        )}
                        {!!dish.calories && dish.calories > 0 && (
                            <View style={styles.metaPill}>
                                <Flame size={14} color={colors.textSecondary} />
                                <Text style={styles.metaPillText}>{dish.calories} {t('cafe.dish.kcal')}</Text>
                            </View>
                        )}
                        {!!dish.cookingTime && dish.cookingTime > 0 && (
                            <View style={styles.metaPill}>
                                <Timer size={14} color={colors.textSecondary} />
                                <Text style={styles.metaPillText}>~{dish.cookingTime} {t('cafe.dish.mins')}</Text>
                            </View>
                        )}
                    </View>

                    {/* Ingredients Section */}
                    {!!dish.ingredients && dish.ingredients.filter(i => i.isRemovable).length > 0 && (
                        <View style={styles.sectionGlass}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('cafe.dish.removeIngredients')}</Text>
                            <View style={styles.ingredientChips}>
                                {dish.ingredients.filter(i => i.isRemovable).map(ingredient => {
                                    const isRemoved = removedIngredients.includes(ingredient.name);
                                    return (
                                        <TouchableOpacity
                                            key={ingredient.id}
                                            style={[styles.chip, isRemoved && styles.chipRemoved]}
                                            onPress={() => toggleIngredient(ingredient.name)}
                                        >
                                            <Text style={[styles.chipText, isRemoved && styles.chipTextRemoved, isRemoved && { color: colors.danger }]}>
                                                {ingredient.name}
                                                {ingredient.isAllergen ? ' ⚠️' : ''}
                                            </Text>
                                            {isRemoved && <X size={12} color={colors.danger} style={{ marginLeft: 6 }} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Modifiers Sections */}
                    {Object.entries(modifierGroups).map(([groupName, modifiers]) => (
                        <View key={groupName} style={styles.sectionGlass}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{groupName}</Text>
                            {modifiers.map(modifier => {
                                const selectedMod = selectedModifiers.find(m => m.modifier.id === modifier.id);
                                const isSelected = !!selectedMod;

                                return (
                                    <TouchableOpacity
                                        key={modifier.id}
                                        style={[
                                            styles.modifierRow,
                                            isSelected && styles.modifierRowSelected,
                                            !modifier.isAvailable && styles.rowDisabled,
                                        ]}
                                        onPress={() => modifier.isAvailable && toggleModifier(modifier)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.modifierLead}>
                                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected, isSelected && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                                                {isSelected && <Check size={12} color={colors.background} strokeWidth={3} />}
                                            </View>
                                            <Text style={[styles.modifierName, !modifier.isAvailable && styles.textDisabled]}>
                                                {modifier.name}
                                                {!modifier.isAvailable && ` (${t('cafe.dish.outOfStock')})`}
                                            </Text>
                                        </View>

                                        <View style={styles.modifierTrail}>
                                            {isSelected && modifier.maxQuantity > 1 && (
                                                <View style={styles.miniQty}>
                                                    <TouchableOpacity
                                                        style={styles.miniQtyBtn}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            updateModifierQuantity(modifier.id, -1);
                                                        }}
                                                    >
                                                        <Minus size={14} color={colors.textPrimary} />
                                                    </TouchableOpacity>
                                                    <Text style={styles.miniQtyVal}>{selectedMod.quantity}</Text>
                                                    <TouchableOpacity
                                                        style={styles.miniQtyBtn}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            updateModifierQuantity(modifier.id, 1);
                                                        }}
                                                    >
                                                        <Plus size={14} color={colors.textPrimary} />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                            <Text style={[styles.modifierPrice, { color: colors.accent }]}>+{modifier.price} ₽</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}

                    {/* Note Box */}
                    <View style={styles.sectionGlass}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('cafe.dish.comment')}</Text>
                        <TextInput
                            style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder={t('cafe.dish.specialWishes')}
                            placeholderTextColor={colors.textSecondary}
                            value={note}
                            onChangeText={setNote}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Floating Action Bar */}
            <View style={styles.actionBar}>
                <View style={styles.qtyAction}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                        <Minus size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.actionQty}>{quantity}</Text>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setQuantity(quantity + 1)}>
                        <Plus size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.mainAddBtn, { shadowColor: colors.accent }, !dish.isAvailable && styles.btnDisabled]}
                    onPress={handleAddToCart}
                    disabled={!dish.isAvailable}
                >
                    <LinearGradient
                        colors={[colors.accent, roleTheme.accentStrong]}
                        style={styles.addGradient}
                    >
                        {dish.isAvailable ? (
                            <>
                                <Text style={[styles.addBtnText, { color: colors.background }]}>{t('cafe.dish.addToCart')}</Text>
                                <View style={styles.priceStrip}>
                                    <Text style={[styles.finalPrice, { color: colors.background }]}>{calculateTotal()} ₽</Text>
                                </View>
                            </>
                        ) : (
                            <Text style={[styles.addBtnText, { color: colors.background }]}>{t('cafe.dish.outOfStock')}</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: colors.textSecondary,
        fontSize: 16,
        marginTop: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imageWrapper: {
        width: '100%',
        height: width * 0.9,
    },
    heroImg: {
        width: '100%',
        height: '100%',
    },
    heroImgPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 0 : 40,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    contentOverlay: {
        marginTop: -40,
        paddingHorizontal: 20,
    },
    dishHeader: {
        marginBottom: 16,
    },
    dishName: {
        color: colors.textPrimary,
        fontSize: 32,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 12,
    },
    badgesFlow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badgeGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    badgeSpicy: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.danger,
    },
    badgeText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '700',
    },
    description: {
        color: colors.textSecondary,
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 20,
    },
    metaStrip: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metaPillText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    sectionGlass: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 20,
    },
    ingredientChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipRemoved: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.danger,
    },
    chipText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextRemoved: {
        color: colors.danger,
        textDecorationLine: 'line-through',
    },
    modifierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modifierRowSelected: {
        borderBottomColor: colors.accentSoft,
    },
    modifierLead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    modifierName: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    modifierTrail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    miniQty: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 4,
        gap: 10,
    },
    miniQtyBtn: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniQtyVal: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '800',
        minWidth: 15,
        textAlign: 'center',
    },
    modifierPrice: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '800',
    },
    rowDisabled: {
        opacity: 0.3,
    },
    textDisabled: {
        color: colors.textSecondary,
    },
    textArea: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        height: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        backgroundColor: colors.surfaceElevated,
        borderTopWidth: 1,
        borderColor: colors.border,
        gap: 20,
    },
    qtyAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 6,
        gap: 16,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionQty: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '900',
        minWidth: 30,
        textAlign: 'center',
    },
    mainAddBtn: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    addGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    addBtnText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
        flex: 1,
        textAlign: 'center',
        marginLeft: 20,
    },
    priceStrip: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    finalPrice: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '900',
    },
    btnDisabled: {
        opacity: 0.5,
    }
});

export default DishDetailScreen;
