import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Utensils, Star, MapPin, Clock, Timer, UtensilsCrossed } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Cafe, Dish, MenuResponse } from '../../../types/cafe';
import { useCart } from '../../../contexts/CafeCartContext';

const { width } = Dimensions.get('window');

type RouteParams = {
    CafeDetail: {
        cafeId: number;
        tableId?: number;
        tableNumber?: string;
    };
};

const CafeDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'CafeDetail'>>();
    const { t } = useTranslation();
    const { cafeId, tableId, tableNumber } = route.params;

    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [menu, setMenu] = useState<MenuResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const scrollY = useRef(new Animated.Value(0)).current;

    const { cart, initCart } = useCart();

    useEffect(() => {
        loadCafeData();
    }, [cafeId]);

    useEffect(() => {
        if (cafe) {
            initCart(cafe.id, cafe.name, tableId, tableNumber);
        }
    }, [cafe, tableId, tableNumber, initCart]);

    const loadCafeData = async () => {
        try {
            setLoading(true);
            const [cafeData, menuData] = await Promise.all([
                cafeService.getCafe(cafeId),
                cafeService.getMenu(cafeId),
            ]);
            setCafe(cafeData);
            setMenu(menuData);

            if (menuData.categories.length > 0) {
                setSelectedCategory(menuData.categories[0].id);
            }
        } catch (error) {
            console.error('Error loading cafe:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDishPress = (dish: Dish) => {
        navigation.navigate('DishDetail', {
            cafeId,
            dishId: dish.id,
            cafeName: cafe?.name,
        });
    };

    const handleCartPress = () => {
        navigation.navigate('CafeCart');
    };

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [200, 60],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 150, 200],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    if (!cafe) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('cafe.dashboard.notFound')}</Text>
            </View>
        );
    }

    const currentDishes = menu?.categories.find(c => c.id === selectedCategory)?.dishes || [];

    return (
        <View style={styles.container}>
            {/* Header with cover image */}
            <Animated.View style={[styles.header, { height: headerHeight }]}>
                <Animated.Image
                    source={{ uri: cafe.coverUrl || cafe.logoUrl || 'https://via.placeholder.com/400x200' }}
                    style={[styles.coverImage, { opacity: headerOpacity }]}
                />
                <View style={styles.headerOverlay}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Table info banner */}
            {!!tableId ? (
                <View style={styles.tableBanner}>
                    <Utensils size={20} color="#FF6B00" strokeWidth={1.5} />
                    <Text style={styles.tableBannerText}>
                        {t('cafe.detail.tableInfo', { tableNumber })}
                    </Text>
                </View>
            ) : null}

            {/* Cafe info */}
            <View style={styles.cafeInfo}>
                <View style={styles.cafeHeader}>
                    {!!cafe.logoUrl ? (
                        <Image source={{ uri: cafe.logoUrl }} style={styles.logo} />
                    ) : null}
                    <View style={styles.cafeHeaderText}>
                        <Text style={styles.cafeName}>{cafe.name}</Text>
                        <View style={styles.ratingRow}>
                            <Star size={16} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
                            <Text style={styles.reviewsText}>({cafe.reviewsCount} {t('cafe.detail.reviews')})</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.description}>{cafe.description}</Text>

                <View style={styles.infoRow}>
                    <MapPin size={16} color="#8E8E93" strokeWidth={1.5} />
                    <Text style={styles.infoText}>{cafe.address}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Clock size={16} color="#8E8E93" strokeWidth={1.5} />
                    <Text style={styles.infoText}>{cafe.workingHours || t('cafe.detail.workingHours')}</Text>
                </View>
                {!!cafe.avgPrepTime && cafe.avgPrepTime > 0 ? (
                    <View style={styles.infoRow}>
                        <Timer size={16} color="#FF6B00" strokeWidth={1.5} />
                        <Text style={styles.infoText}>
                            {t('cafe.detail.prepTime', { time: cafe.avgPrepTime, unit: t('common.min') })}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Category tabs */}
            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {menu?.categories.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryTab,
                                selectedCategory === category.id && styles.categoryTabActive,
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                        >
                            <Text style={[
                                styles.categoryTabText,
                                selectedCategory === category.id && styles.categoryTabTextActive,
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Dishes list */}
            <FlatList
                data={currentDishes}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.dishesContent}
                renderItem={({ item: dish }) => (
                    <TouchableOpacity
                        style={styles.dishCard}
                        onPress={() => handleDishPress(dish)}
                        activeOpacity={0.8}
                    >
                        {!!dish.imageUrl ? (
                            <Image source={{ uri: dish.imageUrl }} style={styles.dishImage} />
                        ) : null}
                        <View style={styles.dishInfo}>
                            <View style={styles.dishHeader}>
                                <Text style={styles.dishName}>{dish.name}</Text>
                                {!!dish.isVegetarian ? (
                                    <View style={styles.vegBadge}>
                                        <Text style={styles.vegBadgeText}>🌱</Text>
                                    </View>
                                ) : null}
                                {!!dish.isSpicy ? (
                                    <View style={styles.spicyBadge}>
                                        <Text style={styles.spicyBadgeText}>🌶️</Text>
                                    </View>
                                ) : null}
                            </View>
                            {!!dish.description ? (
                                <Text style={styles.dishDescription} numberOfLines={2}>
                                    {dish.description}
                                </Text>
                            ) : null}
                            <View style={styles.dishFooter}>
                                <View style={styles.dishMeta}>
                                    {!!dish.weight && dish.weight > 0 ? (
                                        <Text style={styles.dishMetaText}>{dish.weight}{t('cafe.dish.weight')}</Text>
                                    ) : null}
                                    {!!dish.calories && dish.calories > 0 ? (
                                        <Text style={styles.dishMetaText}>{dish.calories} {t('cafe.dish.kcal')}</Text>
                                    ) : null}
                                </View>
                                <View style={styles.priceContainer}>
                                    {!!dish.oldPrice && dish.oldPrice > dish.price ? (
                                        <Text style={styles.oldPrice}>{dish.oldPrice} ₽</Text>
                                    ) : null}
                                    <Text style={styles.price}>{dish.price} ₽</Text>
                                </View>
                            </View>
                            {!dish.isAvailable ? (
                                <View style={styles.unavailableOverlay}>
                                    <Text style={styles.unavailableText}>{t('cafe.dish.outOfStock')}</Text>
                                </View>
                            ) : null}
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <UtensilsCrossed size={64} color="#8E8E93" strokeWidth={1} />
                        <Text style={styles.emptyText}>{t('cafe.detail.noDishes')}</Text>
                    </View>
                }
            />

            {/* Cart button */}
            {!!cart && cart.items.length > 0 ? (
                <TouchableOpacity style={styles.cartButton} onPress={handleCartPress}>
                    <View style={styles.cartButtonContent}>
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cart.items.length}</Text>
                        </View>
                        <Text style={styles.cartButtonText}>{t('cafe.detail.cart')}</Text>
                        <Text style={styles.cartTotal}>{cart.total} ₽</Text>
                    </View>
                </TouchableOpacity>
            ) : null}
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
    header: {
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 48,
        paddingHorizontal: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(28, 28, 30, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 107, 0, 0.15)',
        paddingVertical: 12,
        gap: 8,
    },
    tableBannerText: {
        color: '#FF6B00',
        fontSize: 14,
        fontWeight: '600',
    },
    cafeInfo: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
    },
    cafeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#2C2C2E',
    },
    cafeHeaderText: {
        flex: 1,
    },
    cafeName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    ratingText: {
        color: '#FFFFFF',
        fontWeight: '700',
        marginLeft: 6,
        fontSize: 14,
    },
    reviewsText: {
        color: '#8E8E93',
        marginLeft: 6,
        fontSize: 13,
    },
    description: {
        color: '#A1A1A6',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    infoText: {
        color: '#8E8E93',
        fontSize: 14,
        marginLeft: 10,
    },
    categoryContainer: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
    },
    categoryTab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginHorizontal: 6,
        borderRadius: 100,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    categoryTabActive: {
        backgroundColor: '#FF6B00',
        borderColor: '#FF6B00',
    },
    categoryTabText: {
        color: '#8E8E93',
        fontSize: 14,
        fontWeight: '500',
    },
    categoryTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    dishesContent: {
        padding: 16,
        paddingBottom: 120, // Больше отступа для плавающей кнопки
    },
    dishCard: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    dishImage: {
        width: 110,
        height: 110,
    },
    dishInfo: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between',
    },
    dishHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    dishName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    vegBadge: {
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    vegBadgeText: {
        fontSize: 10,
    },
    spicyBadge: {
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    spicyBadgeText: {
        fontSize: 10,
    },
    dishDescription: {
        color: '#8E8E93',
        fontSize: 13,
        lineHeight: 18,
    },
    dishFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 8,
    },
    dishMeta: {
        flexDirection: 'row',
        gap: 10,
    },
    dishMetaText: {
        color: '#636366',
        fontSize: 12,
        fontWeight: '500',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    oldPrice: {
        color: '#636366',
        fontSize: 13,
        textDecorationLine: 'line-through',
    },
    price: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    unavailableOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(13, 13, 13, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unavailableText: {
        color: '#FF3B30',
        fontWeight: '600',
        fontSize: 14,
        backgroundColor: 'rgba(28, 28, 30, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        overflow: 'hidden',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 48,
        marginTop: 20,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 16,
        marginTop: 16,
        fontWeight: '500',
    },
    cartButton: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#FF6B00',
        borderRadius: 24,
        padding: 16,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    cartButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cartBadge: {
        backgroundColor: '#FFFFFF',
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cartBadgeText: {
        color: '#FF6B00',
        fontWeight: '800',
        fontSize: 13,
    },
    cartButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
    },
    cartTotal: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800',
    },
});

export default CafeDetailScreen;
