/**
 * ServiceDetailScreen - Детали сервиса
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    Share,
    Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
    ArrowLeft,
    Share2,
    MessageCircle,
    MapPin,
    Video,
    Edit,
    Star,
    Eye,
    Calendar,
    Brain,
    Target,
    Infinity as InfinityIcon,
    Flame,
    BookOpen,
    Leaf,
    Sparkles
} from 'lucide-react-native';
import {
    Service,
    getServiceById,
    CATEGORY_LABELS,
    CATEGORY_ICON_NAMES,
    FORMAT_LABELS,
    CHANNEL_LABELS,
    ServiceFormat,
} from '../../../services/serviceService';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';

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

type RouteParams = {
    params: {
        serviceId: number;
    };
};

const parseServiceFormats = (raw?: string): ServiceFormat[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.filter((value): value is ServiceFormat => typeof value === 'string') : [];
    } catch {
        return [];
    }
};

export default function ServiceDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'params'>>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);

    const serviceId = route.params?.serviceId;

    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const latestServiceRequestRef = useRef(0);
    const isMountedRef = useRef(true);

    const loadService = useCallback(async () => {
        const requestId = ++latestServiceRequestRef.current;
        if (!serviceId) {
            if (requestId === latestServiceRequestRef.current && isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
            return;
        }

        try {
            const data = await getServiceById(serviceId);
            if (requestId === latestServiceRequestRef.current && isMountedRef.current) {
                setService(data);
            }
        } catch (error) {
            console.error('Failed to load service:', error);
            if (requestId === latestServiceRequestRef.current && isMountedRef.current) {
                Alert.alert('Ошибка', 'Не удалось загрузить услугу');
                navigation.goBack();
            }
        } finally {
            if (requestId === latestServiceRequestRef.current && isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [serviceId, navigation]);

    useEffect(() => {
        loadService();
    }, [loadService]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            latestServiceRequestRef.current += 1;
        };
    }, []);

    const onRefresh = useCallback(() => {
        if (refreshing || loading) {
            return;
        }
        setRefreshing(true);
        void loadService();
    }, [loadService, loading, refreshing]);

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
        navigation.navigate('Chat', { userId: service.owner.id, name: service.owner.karmicName });
    };

    const isOwner = user?.ID === service?.ownerId;

    const formats = useMemo(() => parseServiceFormats(service?.formats), [service?.formats]);

    const minPrice = service?.tariffs && service.tariffs.length > 0
        ? Math.min(...service.tariffs.map(t => t.price))
        : 0;

    if (loading) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </LinearGradient>
        );
    }

    if (!service) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.errorContainer}>
                        <View style={styles.errorCircle}>
                            <Sparkles size={48} color="rgba(255,255,255,0.1)" />
                        </View>
                        <Text style={styles.errorText}>Услуга не найдена</Text>
                        <TouchableOpacity style={styles.backButtonAlt} onPress={() => navigation.goBack()}>
                            <Text style={styles.backButtonText}>Вернуться назад</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    const iconName = CATEGORY_ICON_NAMES[service.category] || 'Sparkles';
    const categoryLabel = CATEGORY_LABELS[service.category] || service.category;

    return (
        <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Custom Floating Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={handleShare}>
                        <Share2 size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                    }
                >
                    {/* Immersive Cover Section */}
                    <View style={styles.coverSection}>
                        {service.coverImageUrl ? (
                            <Image source={{ uri: service.coverImageUrl }} style={styles.coverImage} />
                        ) : (
                            <LinearGradient
                                colors={[roleTheme.gradient[1], roleTheme.gradient[2]]}
                                style={styles.coverPlaceholder}
                            >
                                <CategoryIcon name={iconName} size={100} color={colors.accentSoft} />
                            </LinearGradient>
                        )}
                        <LinearGradient
                            colors={['rgba(10, 10, 20, 0.3)', 'transparent', 'rgba(10,10,20,1)']}
                            style={styles.coverOverlay}
                        />
                        <View style={styles.categoryBadgeContainer}>
                            <View style={[styles.categoryBadge, { borderColor: colors.accentSoft }]}>
                                <CategoryIcon name={iconName} size={12} color={colors.accent} />
                                <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Content Section */}
                    <View style={styles.contentBody}>
                        <Text style={styles.title}>{service.title}</Text>

                        {/* Owner Floating Card */}
                        {service.owner && (
                            <TouchableOpacity
                                style={styles.ownerCard}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('UserProfile', { userId: service.owner!.id })}
                            >
                                <View style={styles.ownerAvatar}>
                                    <Text style={styles.ownerAvatarText}>
                                        {service.owner.karmicName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.ownerDetails}>
                                    <View style={styles.ownerNameRow}>
                                        <Text style={styles.ownerName}>
                                            {service.owner.karmicName}
                                        </Text>
                                        <Text style={styles.ownerRoleBadge}>Expert</Text>
                                    </View>
                                    <Text style={styles.ownerSubtitle}>
                                        {service.owner.spiritualName || 'Проверенный мастер'}
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.chatIconButton} onPress={handleChat}>
                                    <MessageCircle size={18} color={colors.accent} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}

                        {/* Stats Grid - Glass Cards */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Star size={16} color={colors.accent} fill={colors.accent} />
                                <Text style={styles.statValue}>{service.rating > 0 ? service.rating.toFixed(1) : '5.0'}</Text>
                                <Text style={styles.statLabel}>Рейтинг</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Eye size={16} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.statValue}>{service.viewsCount}</Text>
                                <Text style={styles.statLabel}>Визиты</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Calendar size={16} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.statValue}>{service.bookingsCount}</Text>
                                <Text style={styles.statLabel}>Записи</Text>
                            </View>
                        </View>

                        {/* Description Section */}
                        {service.description && (
                            <View style={styles.infoSection}>
                                <View style={styles.sectionHeadingRow}>
                                    <View style={styles.headingIndicator} />
                                    <Text style={styles.sectionHeading}>О сервисе</Text>
                                </View>
                                <Text style={styles.descriptionText}>{service.description}</Text>
                            </View>
                        )}

                        {/* Logistics Selection */}
                        <View style={styles.infoSection}>
                            <View style={styles.sectionHeadingRow}>
                                <View style={styles.headingIndicator} />
                                <Text style={styles.sectionHeading}>Формат взаимодействия</Text>
                            </View>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                style={styles.logisticsCard}
                            >
                                <View style={styles.logisticsRow}>
                                    <View style={styles.logisticsIcon}>
                                        {service.channel === 'offline' ? <MapPin size={20} color={colors.accent} /> : <Video size={20} color={colors.accent} />}
                                    </View>
                                    <View style={styles.logisticsContent}>
                                        <Text style={styles.logisticsTitle}>{CHANNEL_LABELS[service.channel] || service.channel}</Text>
                                        <Text style={styles.logisticsSubtitle}>
                                            {service.offlineAddress || 'Индивидуальная онлайн-сессия'}
                                        </Text>
                                    </View>
                                </View>
                                {formats.length > 0 && (
                                    <View style={styles.formatTags}>
                                        {formats.map((f) => (
                                            <View key={f} style={styles.formatTag}>
                                                <Text style={styles.formatTagText}>{FORMAT_LABELS[f] || f}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </LinearGradient>
                        </View>

                        {/* Tariffs Mastery */}
                        {service.tariffs && service.tariffs.length > 0 && (
                            <View style={styles.infoSection}>
                                <View style={styles.sectionHeadingRow}>
                                    <View style={styles.headingIndicator} />
                                    <Text style={styles.sectionHeading}>Тарифные планы</Text>
                                </View>
                                {service.tariffs.map((tariff) => (
                                    <TouchableOpacity
                                        key={tariff.id}
                                        activeOpacity={0.9}
                                        style={[styles.tariffItem, tariff.isDefault && styles.tariffItemFeatured]}
                                    >
                                        {tariff.isDefault && (
                                            <View style={styles.featuredBadge}>
                                                <Text style={styles.featuredBadgeText}>Популярный</Text>
                                            </View>
                                        )}
                                        <View style={styles.tariffMainRow}>
                                            <View style={styles.tariffInfo}>
                                                <Text style={styles.tariffTitle}>{tariff.name}</Text>
                                                <View style={styles.tariffMetaRow}>
                                                    {tariff.durationMinutes > 0 && (
                                                        <View style={styles.metaBadge}>
                                                            <Text style={styles.metaBadgeText}>{tariff.durationMinutes} мин</Text>
                                                        </View>
                                                    )}
                                                    {tariff.sessionsCount > 1 && (
                                                        <View style={styles.metaBadge}>
                                                            <Text style={styles.metaBadgeText}>{tariff.sessionsCount} сесс.</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            <View style={styles.tariffPriceContainer}>
                                                <Text style={styles.tariffPriceSymbol}>₵</Text>
                                                <Text style={styles.tariffPriceValue}>{tariff.price.toLocaleString('ru-RU')}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <View style={{ height: 140 }} />
                    </View>
                </ScrollView>

                {/* Fixed Premium Footer */}
                <View style={styles.footerContainer}>
                    <LinearGradient
                        colors={['rgba(10, 10, 20, 0.95)', 'rgba(10,10,20,1)']}
                        style={styles.footer}
                    >
                        <View style={styles.priceColumn}>
                            <Text style={styles.priceLabel}>Начиная от</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceValueSymbol}>₵</Text>
                                <Text style={styles.priceValueText}>
                                    {minPrice > 0 ? minPrice.toLocaleString('ru-RU') : '0'}
                                </Text>
                            </View>
                        </View>

                        {isOwner ? (
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => navigation.navigate('CreateService', { serviceId: service.id })}
                            >
                                <Edit size={18} color={colors.textPrimary} />
                                <Text style={styles.editButtonText}>Правка</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
                                <Text style={styles.bookButtonText}>Забронировать</Text>
                                <View style={styles.bookButtonIcon}>
                                    <Sparkles size={16} color={colors.textPrimary} />
                                </View>
                            </TouchableOpacity>
                        )}
                    </LinearGradient>
                </View>
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
    scrollContent: {
        flexGrow: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 100,
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(10, 10, 20, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    coverSection: {
        width: '100%',
        height: 400,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
    },
    categoryBadgeContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 10, 20, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        gap: 6,
    },
    categoryBadgeText: {
        color: 'rgba(245,158,11,1)',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    contentBody: {
        paddingHorizontal: 20,
        marginTop: -20,
    },
    title: {
        color: 'rgba(255,255,255,1)',
        fontSize: 32,
        fontFamily: 'Cinzel-Bold',
        lineHeight: 40,
        marginBottom: 24,
    },
    ownerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    ownerAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    ownerAvatarText: {
        color: 'rgba(245,158,11,1)',
        fontSize: 22,
        fontWeight: '900',
    },
    ownerDetails: {
        flex: 1,
        marginLeft: 16,
    },
    ownerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ownerName: {
        color: 'rgba(255,255,255,1)',
        fontSize: 17,
        fontWeight: '700',
    },
    ownerRoleBadge: {
        color: 'rgba(245,158,11,1)',
        fontSize: 10,
        fontWeight: '800',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        textTransform: 'uppercase',
    },
    ownerSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginTop: 2,
    },
    chatIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 40,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        paddingVertical: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statValue: {
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 8,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 4,
    },
    infoSection: {
        marginBottom: 32,
    },
    sectionHeadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    headingIndicator: {
        width: 4,
        height: 14,
        backgroundColor: 'rgba(245,158,11,1)',
        borderRadius: 2,
    },
    sectionHeading: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 0.5,
    },
    descriptionText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        lineHeight: 26,
        fontWeight: '400',
    },
    logisticsCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    logisticsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    logisticsIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logisticsContent: {
        flex: 1,
    },
    logisticsTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 17,
        fontWeight: '700',
    },
    logisticsSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginTop: 4,
    },
    formatTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    formatTag: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    formatTagText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    tariffItem: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    tariffItemFeatured: {
        backgroundColor: 'rgba(245, 158, 11, 0.03)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    featuredBadge: {
        position: 'absolute',
        top: -10,
        right: 20,
        backgroundColor: 'rgba(245,158,11,1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    featuredBadgeText: {
        color: 'rgba(0,0,0,1)',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    tariffMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tariffInfo: {
        flex: 1,
    },
    tariffTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    tariffMetaRow: {
        flexDirection: 'row',
        gap: 8,
    },
    metaBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    metaBadgeText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '700',
    },
    tariffPriceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    tariffPriceSymbol: {
        color: 'rgba(245,158,11,1)',
        fontSize: 16,
        fontWeight: '400',
    },
    tariffPriceValue: {
        color: 'rgba(255,255,255,1)',
        fontSize: 24,
        fontWeight: '900',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    priceColumn: {
        flex: 1,
    },
    priceLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginTop: 2,
    },
    priceValueSymbol: {
        color: 'rgba(245,158,11,1)',
        fontSize: 14,
        fontWeight: '800',
    },
    priceValueText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 24,
        fontWeight: '900',
    },
    bookButton: {
        backgroundColor: 'rgba(245,158,11,1)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 20,
        gap: 12,
    },
    bookButtonText: {
        color: 'rgba(0,0,0,1)',
        fontSize: 16,
        fontWeight: '800',
    },
    bookButtonIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButton: {
        backgroundColor: 'rgba(255,255,255,1)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 20,
        gap: 10,
    },
    editButtonText: {
        color: 'rgba(0,0,0,1)',
        fontSize: 16,
        fontWeight: '800',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    errorText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 30,
        textAlign: 'center',
    },
    backButtonAlt: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButtonText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 14,
        fontWeight: '600',
    },
});
