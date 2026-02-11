import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { ModernVedicTheme as vedicTheme } from '../../theme/ModernVedicTheme';
import { useSettings } from '../../context/SettingsContext';
import { Product } from '../../types/market';
import { getMediaUrl } from '../../utils/url';
import { useTranslation } from 'react-i18next';
import { Package, Store, Star } from 'lucide-react-native';

interface ProductCardProps {
    item: Product;
    onPress: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = memo(({ item, onPress }) => {
    const { t } = useTranslation();
    const { isDarkMode, vTheme } = useSettings();
    const colors = vTheme.colors;

    const currentPrice = item.salePrice && item.salePrice > 0 ? item.salePrice : item.basePrice;
    const isOnSale = item.salePrice && item.salePrice > 0 && item.salePrice < item.basePrice;

    return (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => onPress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.glassBackground} />

            <View style={styles.productImageContainer}>
                {item.mainImageUrl ? (
                    <Image
                        source={{ uri: getMediaUrl(item.mainImageUrl) || '' }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.productPlaceholder}>
                        <Package size={32} color="rgba(255,255,255,0.15)" />
                    </View>
                )}

                {isOnSale && (
                    <View style={styles.saleBadge}>
                        <Text style={styles.saleText}>SALE</Text>
                    </View>
                )}

                {!item.trackStock || item.stock > 0 ? null : (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>
                            {t ? t('market.outOfStock') : 'Out of Stock'}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                    {item.name}
                </Text>

                {item.shopInfo && (
                    <View style={styles.shopRow}>
                        <Store size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.shopName, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.shopInfo.name}
                        </Text>
                    </View>
                )}

                <View style={styles.priceRow}>
                    <Text style={styles.price}>
                        {currentPrice.toLocaleString()} {item.currency}
                    </Text>
                    {isOnSale && (
                        <Text style={styles.oldPrice}>
                            {item.basePrice.toLocaleString()}
                        </Text>
                    )}
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.ratingBox}>
                        <Star size={10} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.ratingText}>
                            {item.rating > 0 ? item.rating.toFixed(1) : '5.0'}
                        </Text>
                    </View>
                    <Text style={[styles.salesText, { color: colors.textSecondary }]}>
                        {item.salesCount} {t ? t('market.sold') || 'sold' : 'sold'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    productCard: {
        flex: 1,
        margin: 6,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)', // Base glass layer
    },
    glassBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(25, 25, 45, 0.4)', // Darker glass tint
    },
    productImageContainer: {
        height: 140,
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    productPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saleBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    saleText: {
        color: '#1a1a2e',
        fontSize: 9,
        fontWeight: '900',
    },
    outOfStockBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 6,
    },
    outOfStockText: {
        color: '#fff',
        fontSize: 10,
        textAlign: 'center',
        fontWeight: '700',
    },
    productInfo: {
        padding: 12,
    },
    productName: {
        fontSize: 13,
        fontWeight: '800',
        lineHeight: 18,
        marginBottom: 6,
    },
    shopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    shopName: {
        fontSize: 10,
        fontWeight: '600',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    price: {
        color: '#F59E0B',
        fontSize: 16,
        fontWeight: '900',
    },
    oldPrice: {
        color: 'rgba(255,255,255,0.25)',
        fontSize: 11,
        textDecorationLine: 'line-through',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 8,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '800',
    },
    salesText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
