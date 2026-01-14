import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { ModernVedicTheme as vedicTheme } from '../../theme/ModernVedicTheme';
import { Ad } from '../../types/ads';
import { getMediaUrl } from '../../utils/url';
import { useUser } from '../../context/UserContext';
import {
    Search,
    Package,
    Heart,
    Edit,
    Clock,
    MapPin
} from 'lucide-react-native';

// Fallback if expo-linear-gradient is not available
const Gradient = ({ children, colors, style }: any) => {
    return (
        <View style={[style, { backgroundColor: colors[0] }]}>
            {children}
        </View>
    );
};
// Try import dynamically or assume it exists in project as per typical RN setups. 
// Given the environment, I'll use View as fallback if LinearGradient crashes, but usually better to assume standard dependencies.

interface AdCardProps {
    ad: Ad;
    onPress: () => void;
    onFavorite: () => void;
    onEdit?: () => void;
}

export const AdCard: React.FC<AdCardProps> = ({ ad, onPress, onFavorite, onEdit }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const isOwner = user && user.ID === ad.userId;

    const rawPhotoUrl = ad.photos && ad.photos.length > 0 ? ad.photos[0].photoUrl : null;
    const imageUrl = rawPhotoUrl ? getMediaUrl(rawPhotoUrl) : null;
    const avatarUrl = ad.author?.avatarUrl ? getMediaUrl(ad.author.avatarUrl) : null;



    // Format price
    const formattedPrice = ad.isFree
        ? t('ads.price.free')
        : ad.price
            ? `${ad.price.toLocaleString()} ${ad.currency}`
            : t('ads.price.negotiable');

    // Time ago (simple version)
    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${Math.floor(diffInHours / 24)}d ago`;
    };

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: isDarkMode ? '#2A2A2A' : '#fff',
                    shadowColor: colors.shadow,
                }
            ]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {/* Image Section */}
            <View style={styles.imageContainer}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: isDarkMode ? '#333' : '#F0E6D2' }]}>
                        {ad.adType === 'looking' ? (
                            <Search size={48} color={colors.primary} />
                        ) : (
                            <Package size={48} color={colors.primary} />
                        )}
                    </View>
                )}

                {/* Price Tag */}
                <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{formattedPrice}</Text>
                </View>

                <TouchableOpacity
                    style={styles.favoriteBtn}
                    onPress={(e) => {
                        e.stopPropagation();
                        onFavorite();
                    }}
                >
                    <Heart size={18} color={ad.isFavorite ? '#FF5252' : '#fff'} fill={ad.isFavorite ? '#FF5252' : 'transparent'} />
                </TouchableOpacity>

                {/* Edit Button for Owner */}
                {isOwner && onEdit && (
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                    >
                        <Edit size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={[styles.category, { color: colors.primary }]}>
                        {t(`ads.categories.${ad.category}`).toUpperCase()}
                    </Text>
                    <View style={styles.timeContainer}>
                        <Clock size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.timeText, { color: colors.textSecondary }]}>{timeAgo(ad.CreatedAt)}</Text>
                    </View>
                </View>

                <Text style={[styles.title, { color: isDarkMode ? '#fff' : colors.text }]} numberOfLines={2}>
                    {ad.title}
                </Text>

                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                    {ad.description}
                </Text>

                <View style={styles.footer}>
                    <View style={styles.locationContainer}>
                        <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {ad.city}, {ad.district || 'Center'}
                        </Text>
                    </View>

                    {avatarUrl && (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatar}
                        />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        overflow: 'hidden',
    },
    imageContainer: {
        height: 200,
        backgroundColor: '#eee',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceTag: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    priceText: {
        fontWeight: 'bold',
        color: '#D67D3E', // Primary color
        fontSize: 14,
    },
    favoriteBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    category: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: 'Playfair Display', // Using theme font if linked, else fallback
    },
    description: {
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    editBtn: {
        position: 'absolute',
        top: 16,
        left: 60,
        backgroundColor: 'rgba(255,255,255,0.9)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationText: {
        fontSize: 12,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginLeft: 8,
    },
});
