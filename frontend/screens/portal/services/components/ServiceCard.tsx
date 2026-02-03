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
    CATEGORY_ICONS,
    ACCESS_LABELS,
} from '../../../../services/serviceService';
import { formatBalance } from '../../../../services/walletService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface ServiceCardProps {
    service: Service;
    onPress: (service: Service) => void;
    compact?: boolean;
}

export default function ServiceCard({ service, onPress, compact = false }: ServiceCardProps) {
    const categoryIcon = CATEGORY_ICONS[service.category] || '✨';
    const categoryLabel = CATEGORY_LABELS[service.category] || service.category;

    // Get minimum price from tariffs
    const minPrice = service.tariffs && service.tariffs.length > 0
        ? Math.min(...service.tariffs.map(t => t.price))
        : 0;

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
                            colors={['#667eea', '#764ba2']}
                            style={styles.compactImagePlaceholder}
                        >
                            <Text style={styles.compactPlaceholderIcon}>{categoryIcon}</Text>
                        </LinearGradient>
                    )}
                </View>
                <View style={styles.compactContent}>
                    <Text style={styles.compactTitle} numberOfLines={1}>{service.title}</Text>
                    <Text style={styles.compactCategory}>{categoryIcon} {categoryLabel}</Text>
                    {minPrice > 0 && (
                        <Text style={styles.compactPrice}>от {formatBalance(minPrice)}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(service)}
            activeOpacity={0.85}
        >
            {/* Cover Image */}
            <View style={styles.imageContainer}>
                {service.coverImageUrl ? (
                    <Image
                        source={{ uri: service.coverImageUrl }}
                        style={styles.image}
                    />
                ) : (
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.imagePlaceholder}
                    >
                        <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
                    </LinearGradient>
                )}

                {/* Category Badge */}
                <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{categoryIcon} {categoryLabel}</Text>
                </View>

                {/* Access Badge */}
                {service.accessType === 'free' && (
                    <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>Бесплатно</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>{service.title}</Text>

                <Text style={styles.owner} numberOfLines={1}>
                    {ownerName}
                </Text>

                {service.description && (
                    <Text style={styles.description} numberOfLines={2}>
                        {service.description}
                    </Text>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.stats}>
                        {service.rating > 0 && (
                            <View style={styles.stat}>
                                <Text style={styles.statIcon}>⭐</Text>
                                <Text style={styles.statText}>{service.rating.toFixed(1)}</Text>
                            </View>
                        )}
                        {service.bookingsCount > 0 && (
                            <View style={styles.stat}>
                                <Text style={styles.statIcon}>📅</Text>
                                <Text style={styles.statText}>{service.bookingsCount}</Text>
                            </View>
                        )}
                    </View>

                    {minPrice > 0 ? (
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>от</Text>
                            <Text style={styles.price}>{formatBalance(minPrice)}</Text>
                        </View>
                    ) : service.accessType !== 'free' ? (
                        <Text style={styles.accessLabel}>{ACCESS_LABELS[service.accessType]}</Text>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    imageContainer: {
        width: '100%',
        height: 120,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a2e',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderIcon: {
        fontSize: 48,
    },
    categoryBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    freeBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    freeBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    content: {
        padding: 12,
    },
    title: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    owner: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        marginBottom: 6,
    },
    description: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        lineHeight: 15,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stats: {
        flexDirection: 'row',
        gap: 8,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    statIcon: {
        fontSize: 10,
    },
    statText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 3,
    },
    priceLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
    },
    price: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '700',
    },
    accessLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
    },
    // Compact styles
    compactCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    compactImageContainer: {
        width: 80,
        height: 80,
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
    compactPlaceholderIcon: {
        fontSize: 28,
    },
    compactContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    compactTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    compactCategory: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        marginBottom: 4,
    },
    compactPrice: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '600',
    },
});
