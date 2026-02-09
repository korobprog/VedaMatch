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
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Utensils,
    Star,
    MapPin,
    Clock,
    Timer,
    UtensilsCrossed,
    ShoppingCart,
    Info,
    ChevronRight,
    Flame,
    Leaf
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Cafe, Dish, MenuResponse } from '../../../types/cafe';
import { useCart } from '../../../contexts/CafeCartContext';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const { width, height } = Dimensions.get('window');

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
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
        outputRange: [300, 100],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 150, 200],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
    });

    const titleScale = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [1, 0.8],
        extrapolate: 'clamp',
    });

    if (loading) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </LinearGradient>
        );
    }

    if (!cafe) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <Info size={48} color={colors.textSecondary} />
                <Text style={styles.errorText}>{t('cafe.dashboard.notFound')}</Text>
            </LinearGradient>
        );
    }

    const currentDishes = menu?.categories.find(c => c.id === selectedCategory)?.dishes || [];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={roleTheme.gradient}
                style={StyleSheet.absoluteFill}
            />

            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                {/* Space for animated header */}
                <View style={{ height: 300 }} />

                {/* Cafe Info Section */}
                <View style={styles.infoWrapper}>
                    <View style={styles.infoGlass}>
                        <View style={styles.infoTopRow}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.cafeName}>{cafe.name}</Text>
                                <View style={styles.ratingRow}>
                                    <Star size={14} color={colors.accent} fill={colors.accent} />
                                    <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
                                    <Text style={styles.reviewsText}>({cafe.reviewsCount} {t('cafe.detail.reviews')})</Text>
                                </View>
                            </View>
                            {cafe.logoUrl && (
                                <View style={styles.logoBorder}>
                                    <Image source={{ uri: cafe.logoUrl }} style={styles.logo} />
                                </View>
                            )}
                        </View>

                        <Text style={styles.description}>{cafe.description}</Text>

                        <View style={styles.detailsGrid}>
                            <View style={styles.detailItem}>
                                <View style={styles.detailIcon}>
                                    <MapPin size={16} color={colors.accent} />
                                </View>
                                <Text style={styles.detailText} numberOfLines={2}>{cafe.address}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <View style={styles.detailIcon}>
                                    <Clock size={16} color={colors.accent} />
                                </View>
                                <Text style={styles.detailText}>{cafe.workingHours || t('cafe.detail.workingHours')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Categories */}
                <View style={styles.categoryWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {menu?.categories.map((category) => (
                            <TouchableOpacity
                                key={category.id}
                                style={[
                                    styles.categoryPill,
                                    selectedCategory === category.id && styles.categoryPillActive,
                                ]}
                                onPress={() => setSelectedCategory(category.id)}
                            >
                                <Text style={[
                                    styles.categoryPillText,
                                    selectedCategory === category.id && styles.categoryPillTextActive,
                                ]}>
                                    {category.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Table info banner */}
                {!!tableId && (
                    <View style={styles.tableBanner}>
                        <LinearGradient
                            colors={[roleTheme.accentSoft, 'rgba(255,255,255,0.03)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.tableBannerGradient}
                        >
                            <Utensils size={18} color={colors.accent} />
                            <Text style={styles.tableBannerText}>
                                {t('cafe.detail.tableInfo', { tableNumber })}
                            </Text>
                        </LinearGradient>
                    </View>
                )}

                {/* Dishes */}
                <View style={styles.dishesWrapper}>
                    {currentDishes.length > 0 ? (
                        currentDishes.map((dish) => (
                            <TouchableOpacity
                                key={dish.id}
                                style={styles.dishCard}
                                onPress={() => handleDishPress(dish)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.dishImageContainer}>
                                    {dish.imageUrl ? (
                                        <Image source={{ uri: dish.imageUrl }} style={styles.dishImage} />
                                    ) : (
                                        <View style={styles.dishPlaceholder}>
                                            <Utensils size={32} color={colors.textSecondary} />
                                        </View>
                                    )}
                                    <LinearGradient
                                        colors={['transparent', colors.overlay]}
                                        style={styles.dishOverlay}
                                    />
                                    <View style={styles.dishBadges}>
                                        {dish.isVegetarian && (
                                            <View style={styles.dishBadge}>
                                                <Leaf size={10} color={colors.success} />
                                            </View>
                                        )}
                                        {dish.isSpicy && (
                                            <View style={styles.dishBadge}>
                                                <Flame size={10} color={colors.danger} />
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.dishContent}>
                                    <View style={styles.dishMain}>
                                        <Text style={styles.dishName}>{dish.name}</Text>
                                        <Text style={styles.dishDescription} numberOfLines={2}>{dish.description}</Text>
                                    </View>

                                    <View style={styles.dishFooter}>
                                        <View style={styles.dishPriceRow}>
                                            <Text style={styles.dishPrice}>{dish.price} ₽</Text>
                                            {dish.oldPrice && dish.oldPrice > dish.price && (
                                                <Text style={styles.dishOldPrice}>{dish.oldPrice} ₽</Text>
                                            )}
                                        </View>
                                        <View style={styles.addDishBtn}>
                                            <Plus size={14} color={colors.accent} />
                                        </View>
                                    </View>
                                </View>

                                {!dish.isAvailable && (
                                    <View style={styles.dishUnavailable}>
                                        <Text style={styles.unavailableLabel}>{t('cafe.dish.outOfStock')}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))
                    ) : (
                    <View style={styles.emptyContainer}>
                            <UtensilsCrossed size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>{t('cafe.detail.noDishes')}</Text>
                    </View>
                    )}
                </View>
            </Animated.ScrollView>

            {/* Floating Header */}
            <Animated.View style={[styles.header, { height: headerHeight }]}>
                <Animated.Image
                    source={{ uri: cafe.coverUrl || cafe.logoUrl || 'https://via.placeholder.com/400x200' }}
                    style={[styles.coverImage, { opacity: headerOpacity }]}
                />
                <LinearGradient
                    colors={['rgba(10, 10, 20, 0.8)', 'transparent', 'rgba(10, 10, 20, 0.9)']}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView style={styles.headerControls} edges={['top']}>
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <Animated.Text
                        style={[
                            styles.headerTitle,
                            {
                                opacity: scrollY.interpolate({
                                    inputRange: [150, 200],
                                    outputRange: [0, 1],
                                    extrapolate: 'clamp'
                                }),
                                transform: [{ scale: titleScale }]
                            }
                        ]}
                    >
                        {cafe.name}
                    </Animated.Text>

                    <TouchableOpacity style={styles.headerIconButton}>
                        <Info size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>
            </Animated.View>

            {/* Floating Cart Button */}
            {!!cart && cart.items.length > 0 && (
                <View style={styles.cartContainer}>
                    <TouchableOpacity
                        style={styles.cartBtn}
                        onPress={handleCartPress}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[colors.accent, colors.warning]}
                            style={styles.cartGradient}
                        >
                            <View style={styles.cartInfo}>
                                <View style={styles.cartBadge}>
                                    <Text style={styles.cartCount}>{cart.items.length}</Text>
                                </View>
                                <Text style={styles.cartLabel}>{t('cafe.detail.cart')}</Text>
                            </View>
                            <View style={styles.cartPriceContainer}>
                                <Text style={styles.cartTotal}>{cart.total} ₽</Text>
                                <ChevronRight size={20} color={colors.textPrimary} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

// Reuse Plus icon locally
const Plus = ({ size, color }: { size: number, color: string }) => (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color }} />
        <View style={{ position: 'absolute', width: 2, height: size, backgroundColor: color }} />
    </View>
);

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 150,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: 'hidden',
    },
    coverImage: {
        ...StyleSheet.absoluteFillObject,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 0 : 40,
        height: 100,
    },
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    infoWrapper: {
        paddingHorizontal: 20,
        marginTop: -60,
        zIndex: 11,
    },
    infoGlass: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.overlay,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    infoTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleContainer: {
        flex: 1,
    },
    cafeName: {
        color: colors.textPrimary,
        fontSize: 26,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ratingText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '800',
    },
    reviewsText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    logoBorder: {
        width: 64,
        height: 64,
        borderRadius: 24,
        backgroundColor: colors.surface,
        padding: 3,
        borderWidth: 1,
        borderColor: colors.accentSoft,
    },
    logo: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
    },
    description: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 24,
    },
    detailsGrid: {
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    categoryWrapper: {
        marginTop: 32,
    },
    categoryScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    categoryPill: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryPillActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    categoryPillText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    categoryPillTextActive: {
        color: colors.textPrimary,
    },
    tableBanner: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    tableBannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.accentSoft,
    },
    tableBannerText: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '800',
    },
    dishesWrapper: {
        paddingHorizontal: 20,
        marginTop: 32,
        gap: 16,
    },
    dishCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        flexDirection: 'row',
        height: 140,
    },
    dishImageContainer: {
        width: 120,
        height: '100%',
        position: 'relative',
    },
    dishImage: {
        width: '100%',
        height: '100%',
    },
    dishPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dishOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    dishBadges: {
        position: 'absolute',
        top: 8,
        left: 8,
        gap: 4,
    },
    dishBadge: {
        width: 22,
        height: 22,
        borderRadius: 7,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dishContent: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    dishMain: {
        gap: 4,
    },
    dishName: {
        color: colors.textPrimary,
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    dishDescription: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },
    dishFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dishPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dishPrice: {
        color: colors.accent,
        fontSize: 18,
        fontWeight: '900',
    },
    dishOldPrice: {
        color: colors.textSecondary,
        fontSize: 12,
        textDecorationLine: 'line-through',
    },
    addDishBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.accentSoft,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.accentSoft,
    },
    dishUnavailable: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unavailableLabel: {
        color: colors.danger,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 16,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '700',
    },
    cartContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        zIndex: 100,
    },
    cartBtn: {
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    cartGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        paddingHorizontal: 24,
    },
    cartInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cartBadge: {
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    cartCount: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '900',
    },
    cartLabel: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    cartPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cartTotal: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '900',
    },
    errorText: {
        color: colors.textSecondary,
        fontSize: 16,
        marginTop: 16,
    }
});

export default CafeDetailScreen;
