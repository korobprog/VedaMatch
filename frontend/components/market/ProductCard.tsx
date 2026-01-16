import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { ModernVedicTheme as vedicTheme } from '../../theme/ModernVedicTheme';
import { useSettings } from '../../context/SettingsContext';
import { Product } from '../../types/market';
import { getMediaUrl } from '../../utils/url';
import { Package, Store, Star } from 'lucide-react-native';

interface ProductCardProps {
    item: Product;
    onPress: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = memo(({ item, onPress }) => {
    const { isDarkMode, vTheme } = useSettings();
    const colors = vTheme.colors;

    const currentPrice = item.salePrice && item.salePrice > 0 ? item.salePrice : item.basePrice;
    const isOnSale = item.salePrice && item.salePrice > 0 && item.salePrice < item.basePrice;

    return (
        <TouchableOpacity
            style={[styles.productCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.productImageContainer}>
                {item.mainImageUrl ? (
                    <Image
                        source={{ uri: getMediaUrl(item.mainImageUrl) || '' }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.productPlaceholder, { backgroundColor: colors.primary + '10' }]}>
                        <Package size={32} color={colors.primary} />
                    </View>
                )}
                {isOnSale && (
                    <View style={styles.saleBadge}>
                        <Text style={styles.saleText}>SALE</Text>
                    </View>
                )}
                {!item.trackStock || item.stock > 0 ? null : (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                )}
            </View>

            <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: isDarkMode ? '#fff' : colors.text }]} numberOfLines={2}>
                    {item.name}
                </Text>

                {item.shopInfo && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Store size={10} color={isDarkMode ? '#aaa' : colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.shopName, { color: isDarkMode ? '#aaa' : colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                            {item.shopInfo.name}
                        </Text>
                    </View>
                )}

                <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: colors.primary }]}>
                        {currentPrice.toLocaleString()} {item.currency}
                    </Text>
                    {isOnSale && (
                        <Text style={styles.oldPrice}>
                            {item.basePrice.toLocaleString()}
                        </Text>
                    )}
                </View>

                <View style={styles.statsRow}>
                    {item.rating > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Star size={10} color="#FFA000" fill="#FFA000" style={{ marginRight: 2 }} />
                            <Text style={[styles.rating, { color: '#FFA000' }]}>
                                {item.rating.toFixed(1)}
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.sales, { color: isDarkMode ? '#888' : colors.textSecondary }]}>
                        {item.salesCount} sold
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
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    productImageContainer: {
        height: 140,
        position: 'relative',
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
        top: 8,
        left: 8,
        backgroundColor: '#FF5722',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    saleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    outOfStockBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 6,
    },
    outOfStockText: {
        color: '#fff',
        fontSize: 11,
        textAlign: 'center',
    },
    productInfo: {
        padding: 10,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    shopName: {
        fontSize: 11,
        marginBottom: 6,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    oldPrice: {
        fontSize: 12,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    rating: {
        fontSize: 12,
        fontWeight: '600',
    },
    sales: {
        fontSize: 11,
    },
});
