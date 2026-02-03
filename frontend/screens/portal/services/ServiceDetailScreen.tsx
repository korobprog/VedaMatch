/**
 * ServiceDetailScreen - Детали сервиса
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    Share,
    Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Share2, MessageCircle, MapPin, Video, Edit } from 'lucide-react-native';
import {
    Service,
    getServiceById,
    CATEGORY_LABELS,
    CATEGORY_ICONS,
    FORMAT_LABELS,
    CHANNEL_LABELS,
    ACCESS_LABELS,
    ServiceFormat,
} from '../../../services/serviceService';
import { formatBalance } from '../../../services/walletService';
import { useUser } from '../../../context/UserContext';

const { width } = Dimensions.get('window');

type RouteParams = {
    params: {
        serviceId: number;
    };
};

export default function ServiceDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'params'>>();
    const { user } = useUser();

    const serviceId = route.params?.serviceId;

    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadService = useCallback(async () => {
        if (!serviceId) return;

        try {
            const data = await getServiceById(serviceId);
            setService(data);
        } catch (error) {
            console.error('Failed to load service:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить сервис');
            navigation.goBack();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [serviceId, navigation]);

    useEffect(() => {
        loadService();
    }, [loadService]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadService();
    }, [loadService]);

    const handleShare = async () => {
        if (!service) return;

        try {
            await Share.share({
                message: `${service.title}\n\n${service.description || ''}\n\nЗаписаться: https://vedamatch.ru/services/${service.id}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleBook = () => {
        if (!service) return;
        navigation.navigate('ServiceBooking', { serviceId: service.id });
    };

    const handleChat = () => {
        if (!service?.owner) return;
        navigation.navigate('RoomChat', {
            recipientId: service.owner.id,
            recipientName: service.owner.karmicName,
        });
    };

    const isOwner = user?.ID === service?.ownerId;

    const formats = service?.formats
        ? JSON.parse(service.formats) as ServiceFormat[]
        : [];

    const minPrice = service?.tariffs && service.tariffs.length > 0
        ? Math.min(...service.tariffs.map(t => t.price))
        : 0;

    if (loading) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                </View>
            </LinearGradient>
        );
    }

    if (!service) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorIcon}>😔</Text>
                        <Text style={styles.errorText}>Сервис не найден</Text>
                        <TouchableOpacity style={styles.backButtonAlt} onPress={() => navigation.goBack()}>
                            <Text style={styles.backButtonText}>Назад</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    const categoryIcon = CATEGORY_ICONS[service.category] || '✨';
    const categoryLabel = CATEGORY_LABELS[service.category] || service.category;

    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
                            <Share2 size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
                    }
                >
                    {/* Cover Image */}
                    <View style={styles.coverContainer}>
                        {service.coverImageUrl ? (
                            <Image source={{ uri: service.coverImageUrl }} style={styles.coverImage} />
                        ) : (
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.coverPlaceholder}
                            >
                                <Text style={styles.coverPlaceholderIcon}>{categoryIcon}</Text>
                            </LinearGradient>
                        )}

                        {/* Category Badge */}
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{categoryIcon} {categoryLabel}</Text>
                        </View>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Title & Owner */}
                        <Text style={styles.title}>{service.title}</Text>

                        {service.owner && (
                            <TouchableOpacity
                                style={styles.ownerRow}
                                onPress={() => navigation.navigate('UserProfile', { userId: service.owner!.id })}
                            >
                                <View style={styles.ownerAvatar}>
                                    <Text style={styles.ownerAvatarText}>
                                        {service.owner.karmicName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.ownerInfo}>
                                    <Text style={styles.ownerName}>
                                        {service.owner.karmicName}
                                        {service.owner.spiritualName ? ` ${service.owner.spiritualName}` : ''}
                                    </Text>
                                    <Text style={styles.ownerLabel}>Специалист</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.chatButton}
                                    onPress={handleChat}
                                >
                                    <MessageCircle size={18} color="#FFD700" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            {service.rating > 0 && (
                                <View style={styles.stat}>
                                    <Text style={styles.statIcon}>⭐</Text>
                                    <Text style={styles.statValue}>{service.rating.toFixed(1)}</Text>
                                    <Text style={styles.statLabel}>({service.reviewsCount})</Text>
                                </View>
                            )}
                            <View style={styles.stat}>
                                <Text style={styles.statIcon}>👁️</Text>
                                <Text style={styles.statValue}>{service.viewsCount}</Text>
                                <Text style={styles.statLabel}>просмотров</Text>
                            </View>
                            <View style={styles.stat}>
                                <Text style={styles.statIcon}>📅</Text>
                                <Text style={styles.statValue}>{service.bookingsCount}</Text>
                                <Text style={styles.statLabel}>записей</Text>
                            </View>
                        </View>

                        {/* Description */}
                        {service.description && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Описание</Text>
                                <Text style={styles.description}>{service.description}</Text>
                            </View>
                        )}

                        {/* Formats */}
                        {formats.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Форматы</Text>
                                <View style={styles.tagsRow}>
                                    {formats.map((format) => (
                                        <View key={format} style={styles.tag}>
                                            <Text style={styles.tagText}>{FORMAT_LABELS[format] || format}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Channel */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Формат проведения</Text>
                            <View style={styles.channelRow}>
                                {service.channel === 'offline' ? (
                                    <MapPin size={20} color="#FFD700" />
                                ) : (
                                    <Video size={20} color="#FFD700" />
                                )}
                                <Text style={styles.channelText}>
                                    {CHANNEL_LABELS[service.channel] || service.channel}
                                </Text>
                            </View>
                            {service.offlineAddress && (
                                <Text style={styles.addressText}>{service.offlineAddress}</Text>
                            )}
                        </View>

                        {/* Tariffs */}
                        {service.tariffs && service.tariffs.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Тарифы</Text>
                                <View style={styles.tariffsContainer}>
                                    {service.tariffs.map((tariff) => (
                                        <View
                                            key={tariff.id}
                                            style={[
                                                styles.tariffCard,
                                                tariff.isDefault && styles.tariffCardDefault,
                                            ]}
                                        >
                                            {tariff.isDefault && (
                                                <View style={styles.defaultBadge}>
                                                    <Text style={styles.defaultBadgeText}>Популярный</Text>
                                                </View>
                                            )}
                                            <Text style={styles.tariffName}>{tariff.name}</Text>
                                            <Text style={styles.tariffPrice}>{formatBalance(tariff.price)}</Text>
                                            {tariff.durationMinutes > 0 && (
                                                <Text style={styles.tariffDuration}>
                                                    {tariff.durationMinutes} минут
                                                </Text>
                                            )}
                                            {tariff.sessionsCount > 1 && (
                                                <Text style={styles.tariffSessions}>
                                                    {tariff.sessionsCount} сессий
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                {!isOwner && (
                    <View style={styles.bottomCTA}>
                        <View style={styles.priceContainer}>
                            {minPrice > 0 ? (
                                <>
                                    <Text style={styles.priceLabel}>от</Text>
                                    <Text style={styles.priceValue}>{formatBalance(minPrice)}</Text>
                                </>
                            ) : (
                                <Text style={styles.freeLabel}>{ACCESS_LABELS[service.accessType]}</Text>
                            )}
                        </View>
                        <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
                            <Text style={styles.bookButtonText}>Записаться</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isOwner && (
                    <View style={styles.bottomCTA}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => navigation.navigate('CreateService', { serviceId: service.id })}
                        >
                            <Edit size={20} color="#fff" />
                            <Text style={styles.editButtonText}>Редактировать</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    errorText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 24,
    },
    backButtonAlt: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerAction: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverContainer: {
        width: '100%',
        height: 260,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPlaceholderIcon: {
        fontSize: 80,
    },
    categoryBadge: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    categoryBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 16,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    ownerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    ownerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    ownerName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    ownerLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
    chatButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statIcon: {
        fontSize: 14,
    },
    statValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    description: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 22,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        color: '#fff',
        fontSize: 13,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    channelText: {
        color: '#fff',
        fontSize: 14,
    },
    addressText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        marginTop: 8,
    },
    tariffsContainer: {
        gap: 12,
    },
    tariffCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
        position: 'relative',
    },
    tariffCardDefault: {
        borderWidth: 1,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
    },
    defaultBadge: {
        position: 'absolute',
        top: -8,
        right: 12,
        backgroundColor: '#FFD700',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    defaultBadgeText: {
        color: '#1a1a2e',
        fontSize: 10,
        fontWeight: '700',
    },
    tariffName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    tariffPrice: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    tariffDuration: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
    },
    tariffSessions: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
    },
    bottomCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    priceLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
    },
    priceValue: {
        color: '#FFD700',
        fontSize: 22,
        fontWeight: '700',
    },
    freeLabel: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: '600',
    },
    bookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFD700',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 28,
        gap: 8,
    },
    bookButtonText: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '700',
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: 14,
        borderRadius: 28,
        gap: 8,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
