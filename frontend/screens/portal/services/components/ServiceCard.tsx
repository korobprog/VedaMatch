/**
 * ServiceCard - Карточка сервиса
 */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
    Service,
    CATEGORY_LABELS,
    CATEGORY_ICON_NAMES,
    ACCESS_LABELS,
} from '../../../../services/serviceService';
import { formatBalance } from '../../../../services/walletService';
import { useUser } from '../../../../context/UserContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { useSettings } from '../../../../context/SettingsContext';
import {
    Star,
    Crown,
    Sparkles,
    Brain,
    Target,
    Infinity as InfinityIcon,
    Flame,
    BookOpen,
    Leaf
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2; // Adjusted for better spacing

const CategoryIcon = ({ name, color, size }: { name: string, color: string, size: number }) => {
    switch (name) {
        case 'Star': return <Star size={size} color={color} />;
        case 'Brain': return <Brain size={size} color={color} />;
        case 'Target': return <Target size={size} color={color} />;
        case 'Infinity': return <InfinityIcon size={size} color={color} />;
        case 'Flame': return <Flame size={size} color={color} />;
        case 'BookOpen': return <BookOpen size={size} color={color} />;
        case 'Leaf': return <Leaf size={size} color={color} />;
        case 'Sparkles': return <Sparkles size={size} color={color} />;
        default: return <Sparkles size={size} color={color} />;
    }
};

interface ServiceCardProps {
    service: Service;
    onPress: (service: Service) => void;
    compact?: boolean;
}

export default function ServiceCard({ service, onPress, compact = false }: ServiceCardProps) {
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const iconName = CATEGORY_ICON_NAMES[service.category] || 'Sparkles';
    const categoryLabel = CATEGORY_LABELS[service.category] || service.category;

    // Get minimum price from tariffs
    const minPrice = service.tariffs && service.tariffs.length > 0
        ? Math.min(...service.tariffs.map(t => Number.isFinite(t.price) ? t.price : Number.POSITIVE_INFINITY))
        : Number.POSITIVE_INFINITY;
    const hasPrice = Number.isFinite(minPrice) && minPrice > 0;

    const ownerName = service.owner
        ? `${service.owner.karmicName}${service.owner.spiritualName ? ' ' + service.owner.spiritualName : ''}`
        : 'Специалист';

    if (compact) {
        return (
            <TouchableOpacity
                style={styles.compactCard}
                onPress={() => onPress(service)}
                activeOpacity={0.8}
            >
                <View style={styles.compactImageContainer}>
                    {service.coverImageUrl ? (
                        <Image
                            source={{ uri: service.coverImageUrl }}
                            style={styles.compactImage}
                        />
                    ) : (
                        <LinearGradient
                            colors={[roleTheme.gradient[1], roleTheme.gradient[2]]}
                            style={styles.compactImagePlaceholder}
                        >
                            <CategoryIcon name={iconName} size={32} color={colors.accentSoft} />
                        </LinearGradient>
                    )}
                </View>
                <View style={styles.compactContent}>
                    <Text style={[styles.compactTitle, { color: colors.textPrimary }]} numberOfLines={1}>{service.title}</Text>
                    <View style={styles.compactMeta}>
                        <CategoryIcon name={iconName} size={12} color={colors.accent} />
                        <Text style={[styles.compactCategory, { color: colors.textSecondary }]}>{categoryLabel}</Text>
                    </View>
                    {hasPrice && (
                        <Text style={[styles.compactPrice, { color: colors.accent }]}>от {formatBalance(minPrice)}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onPress(service)}
            activeOpacity={0.9}
        >
            {/* Image Section */}
            <View style={styles.imageContainer}>
                {service.coverImageUrl ? (
                    <Image
                        source={{ uri: service.coverImageUrl }}
                        style={styles.image}
                    />
                ) : (
                    <LinearGradient
                        colors={[roleTheme.gradient[1], roleTheme.gradient[2]]}
                        style={styles.imagePlaceholder}
                    >
                        <CategoryIcon name={iconName} size={40} color={colors.accentSoft} />
                    </LinearGradient>
                )}

                <LinearGradient
                    colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
                    style={styles.imageOverlay}
                />

                <View style={styles.topBadges}>
                    <View style={[styles.categoryBadge, { borderColor: colors.border }]}>
                        <CategoryIcon name={iconName} size={10} color={colors.accent} />
                        <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
                    </View>

                    {service.rating > 0 && (
                        <View style={[styles.ratingBadge, { borderColor: colors.accentSoft }]}>
                            <Star size={10} color={colors.accent} fill={colors.accent} />
                            <Text style={styles.ratingText}>{service.rating.toFixed(1)}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{service.title}</Text>

                <View style={styles.ownerRow}>
                    <View style={[styles.ownerAvatarPlaceholder, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }]}>
                        <Crown size={10} color={colors.accent} />
                    </View>
                    <Text style={[styles.ownerName, { color: colors.textSecondary }]} numberOfLines={1}>{ownerName}</Text>
                </View>

                <View style={styles.footer}>
                    {hasPrice ? (
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceFrom, { color: colors.textSecondary }]}>от</Text>
                            <Text style={[styles.priceValue, { color: colors.accent }]}>{formatBalance(minPrice)}</Text>
                        </View>
                    ) : (
                        <Text style={[styles.priceFrom, { color: colors.textSecondary }]}>По запросу</Text>
                    )}

                    <View style={[styles.actionArrow, { backgroundColor: colors.accentSoft }]}>
                        <Sparkles size={12} color={colors.accent} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        backgroundColor: 'rgba(26,26,46,1)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    imageContainer: {
        width: '100%',
        height: 130,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(10,10,20,1)',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    topBadges: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    categoryBadgeText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    ratingText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 10,
        fontWeight: '800',
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        lineHeight: 18,
        height: 36,
        marginBottom: 8,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    ownerAvatarPlaceholder: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    ownerName: {
        fontSize: 11,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    priceFrom: {
        fontSize: 10,
        fontWeight: '600',
    },
    priceValue: {
        color: 'rgba(245,158,11,1)',
        fontSize: 15,
        fontWeight: '900',
    },
    actionArrow: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        marginBottom: 12,
        padding: 8,
        alignItems: 'center',
    },
    compactImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
    },
    compactImage: {
        width: '100%',
        height: '100%',
    },
    compactImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactContent: {
        flex: 1,
        paddingLeft: 12,
    },
    compactTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    compactMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    compactCategory: {
        fontSize: 11,
    },
    compactPrice: {
        color: 'rgba(245,158,11,1)',
        fontSize: 13,
        fontWeight: '700',
    },
});
