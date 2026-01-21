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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Utensils, X, Scale, Flame, Timer, Check, Minus, Plus } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Dish, DishModifier, SelectedModifier } from '../../../types/cafe';
import { useCart } from '../../../contexts/CafeCartContext';

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

    const [dish, setDish] = useState<Dish | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
    const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
    const [note, setNote] = useState('');

    const { cart, addToCart, initCart } = useCart();

    useEffect(() => {
        loadDish();
    }, [dishId]);

    const loadDish = async () => {
        try {
            setLoading(true);
            const dishData = await cafeService.getDish(cafeId, dishId);
            setDish(dishData);

            // Pre-select default modifiers
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    if (!dish) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('cafe.dish.notFound')}</Text>
            </View>
        );
    }

    // Group modifiers by groupName
    const modifierGroups = dish.modifiers?.reduce((acc, mod) => {
        const group = mod.groupName || t('cafe.dish.modifiers');
        if (!acc[group]) acc[group] = [];
        acc[group].push(mod);
        return acc;
    }, {} as Record<string, DishModifier[]>) || {};

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header with image */}
                <View style={styles.imageContainer}>
                    {dish.imageUrl ? (
                        <Image source={{ uri: dish.imageUrl }} style={styles.image} />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <Utensils size={64} color="#8E8E93" strokeWidth={1} />
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <X size={24} color="#FFFFFF" strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Dish info */}
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{dish.name}</Text>
                        <View style={styles.badges}>
                            {!!dish.isVegetarian && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>🌱 {t('cafe.dish.vegetarian')}</Text>
                                </View>
                            )}
                            {!!dish.isVegan && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>🥬 {t('cafe.dish.vegan')}</Text>
                                </View>
                            )}
                            {!!dish.isSpicy && (
                                <View style={[styles.badge, styles.spicyBadge]}>
                                    <Text style={styles.badgeText}>🌶️ {t('cafe.dish.spicy')}</Text>
                                </View>
                            )}
                            {!!dish.isGlutenFree && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>🌾 {t('cafe.dish.glutenFree')}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {!!dish.description ? (
                        <Text style={styles.description}>{dish.description}</Text>
                    ) : null}

                    <View style={styles.metaRow}>
                        {!!dish.weight && dish.weight > 0 ? (
                            <View style={styles.metaItem}>
                                <Scale size={16} color="#8E8E93" strokeWidth={1.5} />
                                <Text style={styles.metaText}>{dish.weight} {t('cafe.dish.weight')}</Text>
                            </View>
                        ) : null}
                        {!!dish.calories && dish.calories > 0 ? (
                            <View style={styles.metaItem}>
                                <Flame size={16} color="#8E8E93" strokeWidth={1.5} />
                                <Text style={styles.metaText}>{dish.calories} {t('cafe.dish.kcal')}</Text>
                            </View>
                        ) : null}
                        {!!dish.cookingTime && dish.cookingTime > 0 ? (
                            <View style={styles.metaItem}>
                                <Timer size={16} color="#8E8E93" strokeWidth={1.5} />
                                <Text style={styles.metaText}>~{dish.cookingTime} {t('cafe.dish.mins')}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Removable ingredients */}
                    {!!dish.ingredients && dish.ingredients.filter(i => i.isRemovable).length > 0 ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('cafe.dish.removeIngredients')}</Text>
                            <View style={styles.ingredientsList}>
                                {dish.ingredients.filter(i => i.isRemovable).map(ingredient => (
                                    <TouchableOpacity
                                        key={ingredient.id}
                                        style={[
                                            styles.ingredientChip,
                                            removedIngredients.includes(ingredient.name) && styles.ingredientChipRemoved,
                                        ]}
                                        onPress={() => toggleIngredient(ingredient.name)}
                                    >
                                        <Text style={[
                                            styles.ingredientChipText,
                                            removedIngredients.includes(ingredient.name) && styles.ingredientChipTextRemoved,
                                        ]}>
                                            {ingredient.name}
                                            {!!ingredient.isAllergen ? ' ⚠️' : null}
                                        </Text>
                                        {removedIngredients.includes(ingredient.name) ? (
                                            <X size={14} color="#FF3B30" style={{ marginLeft: 4 }} strokeWidth={2} />
                                        ) : null}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    {/* Modifiers */}
                    {Object.entries(modifierGroups).map(([groupName, modifiers]) => (
                        <View key={groupName} style={styles.section}>
                            <Text style={styles.sectionTitle}>{groupName}</Text>
                            {modifiers.map(modifier => {
                                const isSelected = selectedModifiers.some(m => m.modifier.id === modifier.id);
                                const selectedMod = selectedModifiers.find(m => m.modifier.id === modifier.id);

                                return (
                                    <TouchableOpacity
                                        key={modifier.id}
                                        style={[
                                            styles.modifierItem,
                                            isSelected && styles.modifierItemSelected,
                                            !modifier.isAvailable && styles.modifierItemDisabled,
                                        ]}
                                        onPress={() => modifier.isAvailable && toggleModifier(modifier)}
                                        disabled={!modifier.isAvailable}
                                    >
                                        <View style={styles.modifierInfo}>
                                            <View style={[
                                                styles.modifierCheckbox,
                                                isSelected && styles.modifierCheckboxSelected,
                                            ]}>
                                                {!!isSelected ? (
                                                    <Check size={14} color="#FFFFFF" strokeWidth={2} />
                                                ) : null}
                                            </View>
                                            <Text style={[
                                                styles.modifierName,
                                                !modifier.isAvailable && styles.modifierNameDisabled,
                                            ]}>
                                                {modifier.name}
                                                {!!modifier.isAvailable ? null : ` (${t('cafe.dish.outOfStock')})`}
                                            </Text>
                                        </View>
                                        <View style={styles.modifierRight}>
                                            {!!isSelected && modifier.maxQuantity > 1 ? (
                                                <View style={styles.modifierQuantity}>
                                                    <TouchableOpacity
                                                        style={styles.qtyButton}
                                                        onPress={() => updateModifierQuantity(modifier.id, -1)}
                                                    >
                                                        <Minus size={16} color="#FFFFFF" strokeWidth={1.5} />
                                                    </TouchableOpacity>
                                                    <Text style={styles.qtyText}>{selectedMod?.quantity || 1}</Text>
                                                    <TouchableOpacity
                                                        style={styles.qtyButton}
                                                        onPress={() => updateModifierQuantity(modifier.id, 1)}
                                                    >
                                                        <Plus size={16} color="#FFFFFF" strokeWidth={1.5} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : null}
                                            <Text style={styles.modifierPrice}>
                                                +{modifier.price} ₽
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}

                    {/* Note */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('cafe.dish.comment')}</Text>
                        <TextInput
                            style={styles.noteInput}
                            placeholder={t('cafe.dish.specialWishes')}
                            placeholderTextColor="#8E8E93"
                            value={note}
                            onChangeText={setNote}
                            multiline
                            numberOfLines={2}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Bottom bar */}
            <View style={styles.bottomBar}>
                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                        <Minus size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setQuantity(quantity + 1)}
                    >
                        <Plus size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.addButton, !dish.isAvailable && styles.addButtonDisabled]}
                    onPress={handleAddToCart}
                    disabled={!dish.isAvailable}
                >
                    <Text style={styles.addButtonText}>
                        {dish.isAvailable ? `${t('cafe.dish.addToCart')} · ${calculateTotal()} ₽` : t('cafe.dish.outOfStock')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: width,
        height: width * 0.75,
    },
    placeholderImage: {
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 48,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
    },
    header: {
        marginBottom: 12,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    badges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    spicyBadge: {
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
    },
    description: {
        color: '#8E8E93',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    ingredientsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ingredientChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    ingredientChipRemoved: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderColor: '#FF3B30',
    },
    ingredientChipText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    ingredientChipTextRemoved: {
        color: '#FF3B30',
        textDecorationLine: 'line-through',
    },
    modifierItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1C1E',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    modifierItemSelected: {
        backgroundColor: 'rgba(255, 107, 0, 0.15)',
        borderWidth: 1,
        borderColor: '#FF6B00',
    },
    modifierItemDisabled: {
        opacity: 0.5,
    },
    modifierInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modifierCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#8E8E93',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modifierCheckboxSelected: {
        backgroundColor: '#FF6B00',
        borderColor: '#FF6B00',
    },
    modifierName: {
        color: '#FFFFFF',
        fontSize: 15,
    },
    modifierNameDisabled: {
        color: '#8E8E93',
    },
    modifierRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modifierQuantity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qtyButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        minWidth: 20,
        textAlign: 'center',
    },
    modifierPrice: {
        color: '#FF6B00',
        fontSize: 14,
        fontWeight: '600',
    },
    noteInput: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 12,
        color: '#FFFFFF',
        fontSize: 15,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#1C1C1E',
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        gap: 16,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        padding: 4,
    },
    quantityButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        minWidth: 32,
        textAlign: 'center',
    },
    addButton: {
        flex: 1,
        backgroundColor: '#FF6B00',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    addButtonDisabled: {
        backgroundColor: '#8E8E93',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default DishDetailScreen;
