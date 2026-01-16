import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { useSettings } from '../../../context/SettingsContext';
import { Product, CartItem, ProductVariant } from '../../../types/market';
import { Skeleton } from '../../../components/market/Skeleton';
import { EmptyState } from '../../../components/market/EmptyState';
import { getMediaUrl } from '../../../utils/url';
import {
    Package,
    Heart,
    Store,
    MapPin,
    Star,
    ShoppingCart,
    MessageCircle,
    ChevronRight,
    Minus,
    Plus,
    User
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

type RouteParams = {
    ProductDetails: { productId: number };
};

export const ProductDetailsScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'ProductDetails'>>();
    const productId = route.params.productId;

    const { isDarkMode, vTheme } = useSettings();
    const colors = vTheme.colors;

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isFavorite, setIsFavorite] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [loadingReviews, setLoadingReviews] = useState(false);

    useEffect(() => {
        loadProduct();
    }, [productId]);

    const loadProduct = async () => {
        try {
            setLoading(true);
            const data = await marketService.getProduct(productId);
            setProduct(data);
            setIsFavorite(data.isFavorite || false);

            // Select first variant by default if exists
            if (data.variants && data.variants.length > 0) {
                setSelectedVariant(data.variants[0]);
            }
        } catch (error) {
            console.error('Error loading product:', error);
            Alert.alert('Error', 'Failed to load product');
        } finally {
            setLoading(false);
        }
        loadReviews(1);
    };

    const loadReviews = async (page: number) => {
        try {
            setLoadingReviews(true);
            const data = await marketService.getProductReviews(productId, page);
            if (page === 1) {
                setReviews(data.reviews);
            } else {
                setReviews(prev => [...prev, ...data.reviews]);
            }
            setReviewsPage(page);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoadingReviews(false);
        }
    };

    const loadMoreReviews = () => {
        loadReviews(reviewsPage + 1);
    };

    const handleAddReview = () => {
        Alert.prompt(
            'Add Review',
            'How many stars would you give this product? (1-5)',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Next',
                    onPress: (ratingStr) => {
                        const rating = parseInt(ratingStr || '5', 10);
                        if (isNaN(rating) || rating < 1 || rating > 5) {
                            Alert.alert('Invalid rating', 'Please enter a number between 1 and 5');
                            return;
                        }

                        Alert.prompt(
                            'Comment',
                            'What did you like or dislike?',
                            [
                                { text: 'Skip', onPress: () => submitReview(rating, '') },
                                { text: 'Submit', onPress: (comment) => submitReview(rating, comment || '') }
                            ]
                        );
                    }
                }
            ],
            'plain-text',
            '5'
        );
    };

    const submitReview = async (rating: number, comment: string) => {
        try {
            await marketService.addProductReview(productId, { rating, comment });
            Alert.alert('Success', 'Your review has been submitted');
            loadProduct(); // Refresh product stats and reviews
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to submit review';
            Alert.alert('Error', msg);
        }
    };

    const getCurrentPrice = (): number => {
        if (selectedVariant) {
            if (selectedVariant.salePrice && selectedVariant.salePrice > 0) {
                return selectedVariant.salePrice;
            }
            if (selectedVariant.price) {
                return selectedVariant.price;
            }
        }
        if (product?.salePrice && product.salePrice > 0) {
            return product.salePrice;
        }
        return product?.basePrice || 0;
    };

    const getOriginalPrice = (): number => {
        if (selectedVariant?.price) {
            return selectedVariant.price;
        }
        return product?.basePrice || 0;
    };

    const isOnSale = (): boolean => {
        const current = getCurrentPrice();
        const original = getOriginalPrice();
        return current < original;
    };

    const getStock = (): number => {
        if (selectedVariant) {
            return selectedVariant.stock - selectedVariant.reserved;
        }
        return product?.stock || 0;
    };

    const isInStock = (): boolean => {
        if (!product?.trackStock) return true;
        return getStock() > 0;
    };

    const getAllImages = (): string[] => {
        const images: string[] = [];
        if (product?.mainImageUrl) {
            images.push(product.mainImageUrl);
        }
        if (product?.images) {
            product.images.forEach(img => images.push(img.imageUrl));
        }
        return images;
    };

    const handleToggleFavorite = async () => {
        try {
            const result = await marketService.toggleFavorite(productId);
            setIsFavorite(result.isFavorite);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleSelectVariant = (variant: ProductVariant) => {
        setSelectedVariant(variant);
        setQuantity(1);

        // Switch to variant image if available
        if (variant.imageUrl) {
            const images = getAllImages();
            const index = images.indexOf(variant.imageUrl);
            if (index >= 0) {
                setSelectedImageIndex(index);
            }
        }
    };

    const handleQuantityChange = (delta: number) => {
        const newQty = quantity + delta;
        const maxStock = getStock();

        if (newQty >= 1 && newQty <= maxStock) {
            setQuantity(newQty);
        }
    };

    const handleAddToCart = () => {
        // TODO: Implement cart context
        Alert.alert(
            'Added to Cart',
            `${quantity}x ${product?.name} ${selectedVariant ? `(${selectedVariant.name})` : ''}`,
            [
                { text: 'Continue Shopping' },
                { text: 'Go to Checkout', onPress: () => navigation.navigate('Checkout') }
            ]
        );
    };

    const handleBuyNow = () => {
        // Navigate directly to checkout
        navigation.navigate('Checkout', {
            items: [{
                productId,
                variantId: selectedVariant?.ID,
                quantity,
                product,
                variant: selectedVariant,
            }]
        });
    };

    const handleShopPress = () => {
        if (product?.shopInfo) {
            navigation.navigate('ShopDetails', { shopId: product.shopInfo.id });
        }
    };

    const handleContactSeller = () => {
        if (product?.shopInfo) {
            // Navigate to seller contact
            navigation.navigate('Chat', { userId: product.shopId });
        }
    };

    if (loading || !product) {
        return (
            <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
                <ScrollView>
                    <Skeleton height={width} borderRadius={0} />
                    <View style={{ padding: 16 }}>
                        <Skeleton width="40%" height={24} style={{ marginBottom: 16, borderRadius: 12 }} />
                        <Skeleton width="70%" height={32} style={{ marginBottom: 12 }} />
                        <Skeleton width="30%" height={36} style={{ marginBottom: 20 }} />
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
                            <Skeleton width={60} height={20} />
                            <Skeleton width={60} height={20} />
                        </View>
                        <Skeleton width="100%" height={80} style={{ marginBottom: 24 }} />
                        <Skeleton width="100%" height={200} />
                    </View>
                </ScrollView>
            </View>
        );
    }

    const images = getAllImages();
    const currentPrice = getCurrentPrice();
    const originalPrice = getOriginalPrice();

    return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
            <ScrollView>
                {/* Image Gallery */}
                <View style={styles.imageSection}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setSelectedImageIndex(index);
                        }}
                    >
                        {images.length > 0 ? images.map((img, index) => (
                            <Image
                                key={index}
                                source={{ uri: getMediaUrl(img) || '' }}
                                style={styles.mainImage}
                                resizeMode="cover"
                            />
                        )) : (
                            <View style={[styles.mainImage, styles.placeholderImage, { backgroundColor: colors.primary + '10' }]}>
                                <Package size={80} color={colors.primary} opacity={0.3} />
                            </View>
                        )}
                    </ScrollView>

                    {/* Image indicators */}
                    {images.length > 1 && (
                        <View style={styles.imageIndicators}>
                            {images.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.indicator,
                                        { backgroundColor: index === selectedImageIndex ? colors.primary : 'rgba(255,255,255,0.5)' }
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Favorite button */}
                    <TouchableOpacity style={styles.favoriteBtn} onPress={handleToggleFavorite}>
                        <Heart size={24} color={isFavorite ? '#FF5252' : '#fff'} fill={isFavorite ? '#FF5252' : 'transparent'} />
                    </TouchableOpacity>

                    {/* Sale badge */}
                    {isOnSale() && (
                        <View style={styles.saleBadge}>
                            <Text style={styles.saleText}>
                                -{Math.round((1 - currentPrice / originalPrice) * 100)}%
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    {/* Shop info */}
                    {product.shopInfo && (
                        <TouchableOpacity style={[styles.shopCard, { backgroundColor: isDarkMode ? '#252525' : '#f5f5f5' }]} onPress={handleShopPress}>
                            <View style={[styles.shopLogo, { backgroundColor: colors.primary + '15' }]}>
                                {product.shopInfo.logoUrl ? (
                                    <Image source={{ uri: getMediaUrl(product.shopInfo.logoUrl) || '' }} style={styles.shopLogoImage} />
                                ) : (
                                    <Store size={20} color={colors.primary} />
                                )}
                            </View>
                            <View style={styles.shopInfo}>
                                <Text style={[styles.shopName, { color: isDarkMode ? '#fff' : colors.text }]}>
                                    {product.shopInfo.name}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                                    <Text style={[styles.shopCity, { color: colors.textSecondary, marginTop: 0 }]}>
                                        {product.shopInfo.city} •
                                    </Text>
                                    <Star size={12} color="#FFA000" fill="#FFA000" style={{ marginHorizontal: 4 }} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                        {product.shopInfo.rating.toFixed(1)}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={colors.primary} />
                        </TouchableOpacity>
                    )}

                    {/* Product name & price */}
                    <Text style={[styles.productName, { color: isDarkMode ? '#fff' : colors.text }]}>
                        {product.name}
                    </Text>

                    <View style={styles.priceSection}>
                        <Text style={[styles.currentPrice, { color: colors.primary }]}>
                            {currentPrice.toLocaleString()} {product.currency}
                        </Text>
                        {isOnSale() && (
                            <Text style={styles.originalPrice}>
                                {originalPrice.toLocaleString()} {product.currency}
                            </Text>
                        )}
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        {product.rating > 0 && (
                            <View style={styles.statItem}>
                                <Star size={14} color="#FFA000" fill="#FFA000" />
                                <Text style={{ color: '#FFA000', fontWeight: '700' }}>{product.rating.toFixed(1)}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                    ({product.reviewsCount})
                                </Text>
                            </View>
                        )}
                        <View style={styles.statItem}>
                            <Text style={{ color: isDarkMode ? '#aaa' : colors.textSecondary }}>
                                {product.salesCount} {t('market.sold')}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={{ color: isDarkMode ? '#aaa' : colors.textSecondary }}>
                                {product.viewsCount} {t('market.views')}
                            </Text>
                        </View>
                    </View>

                    {/* Variants */}
                    {product.variants && product.variants.length > 0 && (
                        <View style={styles.variantsSection}>
                            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                                {t('market.selectOption') || 'Select Option'}
                            </Text>
                            <View style={styles.variantsList}>
                                {product.variants.map((variant) => (
                                    <TouchableOpacity
                                        key={variant.ID}
                                        style={[
                                            styles.variantBtn,
                                            {
                                                backgroundColor: selectedVariant?.ID === variant.ID ? colors.primary : (isDarkMode ? '#333' : '#f0f0f0'),
                                                borderColor: selectedVariant?.ID === variant.ID ? colors.primary : 'transparent',
                                            }
                                        ]}
                                        onPress={() => handleSelectVariant(variant)}
                                        disabled={variant.stock <= 0}
                                    >
                                        <Text style={[
                                            styles.variantLabel,
                                            {
                                                color: selectedVariant?.ID === variant.ID ? '#fff' : (isDarkMode ? '#fff' : colors.text),
                                                opacity: variant.stock <= 0 ? 0.5 : 1
                                            }
                                        ]}>
                                            {variant.name || variant.sku}
                                        </Text>
                                        {variant.stock <= 0 && (
                                            <Text style={styles.outOfStock}>Out of stock</Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Quantity */}
                    <View style={styles.quantitySection}>
                        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                            {t('market.quantity')}
                        </Text>
                        <View style={styles.quantityControls}>
                            <TouchableOpacity
                                style={[styles.quantityBtn, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]}
                                onPress={() => handleQuantityChange(-1)}
                                disabled={quantity <= 1}
                            >
                                <Minus size={20} color={quantity <= 1 ? '#999' : colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.quantityValue, { color: isDarkMode ? '#fff' : colors.text }]}>
                                {quantity}
                            </Text>
                            <TouchableOpacity
                                style={[styles.quantityBtn, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]}
                                onPress={() => handleQuantityChange(1)}
                                disabled={quantity >= getStock()}
                            >
                                <Plus size={20} color={quantity >= getStock() ? '#999' : colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.stockInfo, { color: colors.textSecondary }]}>
                                {isInStock() ? `${getStock()} ${t('market.available')}` : t('market.outOfStock')}
                            </Text>
                        </View>
                    </View>

                    {/* Description */}
                    {product.shortDescription && (
                        <View style={styles.descriptionSection}>
                            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                                {t('market.description')}
                            </Text>
                            <Text style={[styles.description, { color: isDarkMode ? '#ddd' : colors.text }]}>
                                {product.shortDescription}
                            </Text>
                            {product.fullDescription && (
                                <Text style={[styles.description, { color: isDarkMode ? '#aaa' : colors.textSecondary, marginTop: 8 }]}>
                                    {product.fullDescription}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Reviews Section */}
                    <View style={styles.reviewsSection}>
                        <View style={styles.reviewsHeader}>
                            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                                {t('market.reviews')} ({product.reviewsCount})
                            </Text>
                            <TouchableOpacity
                                style={[styles.addReviewBtn, { backgroundColor: colors.primary + '20' }]}
                                onPress={() => handleAddReview()}
                            >
                                <Text style={[styles.addReviewText, { color: colors.primary }]}>
                                    + {t('market.addReview')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loadingReviews && reviews.length === 0 ? (
                            <View style={{ gap: 16 }}>
                                {[1, 2].map(i => (
                                    <View key={i} style={{ paddingVertical: 16 }}>
                                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                                            <Skeleton width={32} height={32} borderRadius={16} />
                                            <Skeleton width="40%" height={16} />
                                        </View>
                                        <Skeleton width="100%" height={40} />
                                    </View>
                                ))}
                            </View>
                        ) : reviews.length > 0 ? (
                            reviews.map((review) => (
                                <View key={review.ID} style={[styles.reviewCard, { borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
                                    <View style={styles.reviewUserRow}>
                                        <View style={[styles.userAvatar, { backgroundColor: colors.primary + '15' }]}>
                                            <User size={16} color={colors.primary} />
                                        </View>
                                        <View style={styles.reviewUserInfo}>
                                            <Text style={[styles.reviewUserName, { color: isDarkMode ? '#fff' : colors.text }]}>
                                                {review.user?.name || 'User'}
                                            </Text>
                                            <View style={styles.reviewRatingRow}>
                                                <Text style={{ color: '#FFA000', fontSize: 12 }}>
                                                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                                </Text>
                                                {review.isVerifiedPurchase && (
                                                    <View style={styles.verifiedBadge}>
                                                        <Text style={styles.verifiedText}>Verified Purchase</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                                            {new Date(review.CreatedAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    {review.title && (
                                        <Text style={[styles.reviewTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                                            {review.title}
                                        </Text>
                                    )}
                                    <Text style={[styles.reviewComment, { color: isDarkMode ? '#ccc' : colors.textSecondary }]}>
                                        {review.comment}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <EmptyState
                                icon={<MessageCircle size={64} color={colors.textSecondary} opacity={0.3} />}
                                title={t('market.noReviewsTitle')}
                                message={t('market.noReviewsMsg')}
                                actionLabel={"+ " + t('market.addReview')}
                                onAction={handleAddReview}
                            />
                        )}

                        {product.reviewsCount > reviews.length && (
                            <TouchableOpacity style={styles.loadMoreReviews} onPress={loadMoreReviews}>
                                <Text style={{ color: colors.primary }}>{t('market.loadMoreReviews')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Contact Seller */}
                    <TouchableOpacity
                        style={[styles.contactBtn, { borderColor: colors.primary, marginTop: 24 }]}
                        onPress={handleContactSeller}
                    >
                        <MessageCircle size={20} color={colors.primary} />
                        <Text style={[styles.contactBtnText, { color: colors.primary }]}>
                            {t('market.contactSeller')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Bottom action bar */}
            <View style={[styles.bottomBar, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                <View style={styles.totalSection}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('market.total')}</Text>
                    <Text style={[styles.totalPrice, { color: colors.primary }]}>
                        {(currentPrice * quantity).toLocaleString()} {product.currency}
                    </Text>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.cartBtn, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]}
                        onPress={handleAddToCart}
                        disabled={!isInStock()}
                    >
                        <ShoppingCart size={24} color={!isInStock() ? '#999' : colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.buyBtn, { backgroundColor: isInStock() ? colors.gradientStart : '#ccc' }]}
                        onPress={handleBuyNow}
                        disabled={!isInStock()}
                    >
                        <Text style={styles.buyBtnText}>
                            {isInStock() ? t('market.buyNow') : t('market.outOfStock')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageSection: {
        position: 'relative',
    },
    mainImage: {
        width: width,
        height: width,
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageIndicators: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    favoriteBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saleBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: '#FF5722',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    saleText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    shopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    shopLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    shopLogoImage: {
        width: '100%',
        height: '100%',
    },
    shopInfo: {
        flex: 1,
        marginLeft: 12,
    },
    shopName: {
        fontSize: 15,
        fontWeight: '600',
    },
    shopCity: {
        fontSize: 12,
        marginTop: 2,
    },
    productName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10,
        marginBottom: 12,
    },
    currentPrice: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    originalPrice: {
        fontSize: 16,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 13,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },
    variantsSection: {
        marginBottom: 20,
    },
    variantsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    variantBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 2,
    },
    variantLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    outOfStock: {
        fontSize: 10,
        color: '#f44336',
        marginTop: 2,
    },
    quantitySection: {
        marginBottom: 20,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    quantityBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityBtnText: {
        fontSize: 22,
        fontWeight: '600',
    },
    quantityValue: {
        fontSize: 20,
        fontWeight: '700',
        minWidth: 40,
        textAlign: 'center',
    },
    stockInfo: {
        marginLeft: 8,
        fontSize: 13,
    },
    descriptionSection: {
        marginBottom: 20,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
    },
    contactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        gap: 8,
        marginBottom: 16,
    },
    contactBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    reviewsSection: {
        marginTop: 24,
        paddingBottom: 24,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addReviewBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addReviewText: {
        fontSize: 14,
        fontWeight: '600',
    },
    reviewCard: {
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    reviewUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    reviewUserInfo: {
        flex: 1,
    },
    reviewUserName: {
        fontSize: 14,
        fontWeight: '600',
    },
    reviewRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    verifiedBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    verifiedText: {
        color: '#2E7D32',
        fontSize: 10,
        fontWeight: 'bold',
    },
    reviewDate: {
        fontSize: 12,
    },
    reviewTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    reviewComment: {
        fontSize: 14,
        lineHeight: 20,
    },
    noReviews: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 14,
        fontStyle: 'italic',
    },
    loadMoreReviews: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    totalSection: {
        flex: 1,
    },
    totalLabel: {
        fontSize: 12,
    },
    totalPrice: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    cartBtn: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyBtn: {
        paddingHorizontal: 28,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
