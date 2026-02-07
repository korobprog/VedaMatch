import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Store, Star, MapPin } from 'lucide-react-native';
import { Shop } from '../../types/market';
import { getMediaUrl } from '../../utils/url';

const { width } = Dimensions.get('window');

interface ShopCardProps {
    item: Shop;
    onPress: (shop: Shop) => void;
}

export const ShopCard: React.FC<ShopCardProps> = memo(({ item, onPress }) => {
    const { t } = useTranslation();

    return (
        <TouchableOpacity
            style={styles.shopCard}
            onPress={() => onPress(item)}
            activeOpacity={0.9}
        >
            <View style={styles.glassBackground} />

            <View style={styles.shopImageContainer}>
                {item.logoUrl ? (
                    <Image source={{ uri: getMediaUrl(item.logoUrl) || '' }} style={styles.shopLogo} />
                ) : (
                    <View style={styles.shopLogoPlaceholder}>
                        <Store size={40} color="rgba(255,255,255,0.1)" />
                    </View>
                )}
                <LinearGradient
                    colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
                    style={styles.cardImageOverlay}
                />

                <View style={styles.cardTopBadges}>
                    <View style={styles.ratingBadge}>
                        <Star size={10} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.ratingText}>
                            {item.rating > 0 ? item.rating.toFixed(1) : t('market.new')}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.shopInfo}>
                <Text style={styles.shopName} numberOfLines={1}>
                    {item.name}
                </Text>

                <Text style={styles.shopCategory} numberOfLines={1}>
                    {item.category}
                </Text>

                <View style={styles.shopMeta}>
                    <View style={styles.detailItem}>
                        <MapPin size={10} color="rgba(255, 255, 255, 0.4)" />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {item.city}
                        </Text>
                    </View>
                    <Text style={styles.productsCount}>
                        {item.productsCount} {t('market.map.productsCount')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    shopCard: {
        width: (width - 52) / 2,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    glassBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(25, 25, 45, 0.4)',
    },
    shopImageContainer: {
        height: 120,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shopLogo: {
        width: '100%',
        height: '100%',
    },
    shopLogoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    cardImageOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    cardTopBadges: {
        position: 'absolute',
        top: 8,
        left: 8,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
    },
    ratingText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
    shopInfo: {
        padding: 12,
    },
    shopName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        marginBottom: 4,
    },
    shopCategory: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        marginBottom: 8,
        textTransform: 'capitalize',
        fontWeight: '600',
    },
    shopMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 9,
        fontWeight: '500',
    },
    productsCount: {
        color: '#F59E0B',
        fontSize: 9,
        fontWeight: '800',
    },
});
