/**
 * ServicesHomeScreen - services module home screen
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    ImageBackground,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Search,
    Briefcase,
    PlusCircle,
    History,
    Users,
    Star,
    Brain,
    Target,
    Infinity as InfinityIcon,
    Flame,
    BookOpen,
    Leaf,
    Sparkles,
    Radio,
} from 'lucide-react-native';
import {
    Service,
    ServiceCategory,
} from '../../../services/serviceService';
import {
    flattenServicesPages,
    useServicesFeedQuery,
} from '../../../hooks/queries/useServicesFeedQuery';
import ServiceCard from './components/ServiceCard';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';
import { BalancePill } from '../../../components/wallet/BalancePill';
import { AssistantChatButton } from '../../../components/portal/AssistantChatButton';
import { resolveEffectivePerformanceMode } from '../../../utils/androidVisualPolicy';
import { FEATURE_FLAGS } from '../../../config/featureFlags';
import { FlashList, shouldUseFlashList } from '../../../lib/flashListCompat';

const CATEGORIES: { key: ServiceCategory | 'all'; labelKey: string; iconName: string }[] = [
    { key: 'all', labelKey: 'portal.servicesHome.categories.all', iconName: 'Sparkles' },
    { key: 'astrology', labelKey: 'portal.servicesHome.categories.astrology', iconName: 'Star' },
    { key: 'psychology', labelKey: 'portal.servicesHome.categories.psychology', iconName: 'Brain' },
    { key: 'coaching', labelKey: 'portal.servicesHome.categories.coaching', iconName: 'Target' },
    { key: 'spirituality', labelKey: 'portal.servicesHome.categories.spirituality', iconName: 'Infinity' },
    { key: 'yagya', labelKey: 'portal.servicesHome.categories.yagya', iconName: 'Flame' },
    { key: 'education', labelKey: 'portal.servicesHome.categories.education', iconName: 'BookOpen' },
    { key: 'health', labelKey: 'portal.servicesHome.categories.health', iconName: 'Leaf' },
    { key: 'other', labelKey: 'portal.servicesHome.categories.other', iconName: 'Sparkles' },
];

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
        case 'History': return <History size={size} color={color} />;
        case 'Briefcase': return <Briefcase size={size} color={color} />;
        default: return <Sparkles size={size} color={color} />;
    }
};

// Re-importing local components or defining them if needed. 
// Assuming InfinityIcon is already handled by import Infinity as InfinityIcon in previous thought if shared, 
// but here I need to be careful with scope. I'll just use the icons directly in the render.

interface ServicesHomeScreenProps {
    onBack?: () => void;
}

const ServicesHomeScreen: React.FC<ServicesHomeScreenProps> = ({ onBack }) => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode, performanceMode, runtimePerformanceState } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const effectivePerformanceMode = useMemo(
        () => resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';

    const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const servicesQuery = useServicesFeedQuery({
        category: selectedCategory,
        search: debouncedSearchQuery,
        limit: 20,
    });
    const services = useMemo(() => flattenServicesPages(servicesQuery.data), [servicesQuery.data]);
    const ServicesListComponent: any = shouldUseFlashList(FEATURE_FLAGS.flashlistServices) ? FlashList : FlatList;
    const loading = servicesQuery.isLoading;
    const refreshing = servicesQuery.isRefetching && !servicesQuery.isFetchingNextPage;
    const loadingMore = servicesQuery.isFetchingNextPage;
    const hasMore = Boolean(servicesQuery.hasNextPage);

    const onRefresh = useCallback(() => {
        if (servicesQuery.isRefetching) {
            return;
        }
        servicesQuery.refetch();
    }, [servicesQuery]);

    const onLoadMore = useCallback(() => {
        if (!servicesQuery.hasNextPage || servicesQuery.isFetchingNextPage || servicesQuery.isLoading) return;
        servicesQuery.fetchNextPage();
    }, [servicesQuery]);

    const handleServicePress = useCallback((service: Service) => {
        navigation.navigate('ServiceDetail', { serviceId: service.id });
    }, [navigation]);

    const handleCreateService = useCallback(() => {
        navigation.navigate('CreateService');
    }, [navigation]);

    const handleMyServices = useCallback(() => {
        navigation.navigate('MyServices');
    }, [navigation]);

    const handleMyBookings = useCallback(() => {
        navigation.navigate('MyBookings');
    }, [navigation]);

    const handleIncomingBookings = useCallback(() => {
        navigation.navigate('IncomingBookings');
    }, [navigation]);

    const handleChannels = useCallback(() => {
        navigation.navigate('ChannelsHub');
    }, [navigation]);

    const renderServiceItem = useCallback(({ item }: { item: Service }) => (
        <ServiceCard service={item} onPress={handleServicePress} compact={isAndroidReducedEffects} />
    ), [handleServicePress, isAndroidReducedEffects]);

    const listTuningProps = useMemo(() => (
        Platform.OS === 'android'
            ? {
                removeClippedSubviews: true,
                windowSize: isAndroidReducedEffects ? 5 : 7,
                initialNumToRender: isAndroidReducedEffects ? 4 : 6,
                maxToRenderPerBatch: isAndroidReducedEffects ? 4 : 6,
                updateCellsBatchingPeriod: isAndroidReducedEffects ? 34 : 24,
            }
            : {}
    ), [isAndroidReducedEffects]);

    const renderHeader = () => (
        <View style={styles.header}>
            {isAndroidReducedEffects ? (
                <View style={[styles.bannerHeader, { backgroundColor: roleTheme.gradient[1] }]}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => onBack ? onBack() : navigation.goBack()}
                        >
                            <ArrowLeft size={22} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text
                                style={[styles.headerTitle, styles.headerTitleReducedAndroid, { color: '#FFFFFF' }]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {t('portal.servicesHome.headerTitle')}
                            </Text>
                            <Text style={[styles.headerSubtitle, styles.headerSubtitleReducedAndroid, { color: 'rgba(255,255,255,0.8)' }]}>{t('portal.servicesHome.headerSubtitle')}</Text>
                        </View>

                        <View style={styles.headerActions}>
                            <AssistantChatButton />
                            <BalancePill size="small" lightMode={true} />
                        </View>
                    </View>
                </View>
            ) : (
                <ImageBackground
                    source={require('../../../assets/services_banner_bg.png')}
                    style={styles.bannerHeader}
                    imageStyle={styles.bannerImage}
                >
                    <View style={styles.bannerOverlay} />
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => onBack ? onBack() : navigation.goBack()}
                        >
                            <ArrowLeft size={22} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text
                                style={[styles.headerTitle, { color: '#FFFFFF' }]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {t('portal.servicesHome.headerTitle')}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>{t('portal.servicesHome.headerSubtitle')}</Text>
                        </View>

                        <View style={styles.headerActions}>
                            <AssistantChatButton />
                            <BalancePill size="small" lightMode={true} />
                        </View>
                    </View>
                </ImageBackground>
            )}

            {/* Featured Actions - Premium Cards */}
            <View style={styles.featuredActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[
                            styles.featuredCard,
                            { backgroundColor: colors.surface, borderColor: colors.accentSoft },
                            isAndroidReducedEffects && styles.featuredCardReducedAndroid,
                        ]}
                        onPress={handleCreateService}
                    >
                        {!isAndroidReducedEffects && (
                            <LinearGradient
                                colors={[roleTheme.accentSoft, 'transparent']}
                                style={styles.cardGradient}
                            />
                        )}
                        <View style={styles.actionIconOuter}>
                            <PlusCircle size={24} color={colors.accent} />
                        </View>
                        <View>
                            <Text style={[styles.featuredCardTitle, { color: colors.textPrimary }]}>{t('portal.servicesHome.featured.createTitle')}</Text>
                            <Text style={[styles.featuredCardSub, { color: colors.textSecondary }]}>{t('portal.servicesHome.featured.createSubtitle')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.featuredCard,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            isAndroidReducedEffects && styles.featuredCardReducedAndroid,
                        ]}
                        onPress={handleIncomingBookings}
                    >
                        <View style={styles.actionIconOuter}>
                            <Users size={24} color={colors.textPrimary} />
                        </View>
                        <View>
                            <Text style={[styles.featuredCardTitle, { color: colors.textPrimary }]}>{t('portal.servicesHome.featured.ordersTitle')}</Text>
                            <Text style={[styles.featuredCardSub, { color: colors.textSecondary }]}>{t('portal.servicesHome.featured.ordersSubtitle')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionRow, { marginTop: 12 }]}>
                    <TouchableOpacity style={styles.miniAction} onPress={handleMyBookings}>
                        <History size={18} color={colors.textSecondary} />
                        <Text style={[styles.miniActionLabel, { color: colors.textSecondary }]}>{t('portal.servicesHome.mini.myBookings')}</Text>
                    </TouchableOpacity>
                    <View style={styles.miniDivider} />
                    <TouchableOpacity style={styles.miniAction} onPress={handleChannels}>
                        <Radio size={18} color={colors.textSecondary} />
                        <Text style={[styles.miniActionLabel, { color: colors.textSecondary }]}>{t('portal.servicesHome.mini.channels')}</Text>
                    </TouchableOpacity>
                    <View style={styles.miniDivider} />
                    <TouchableOpacity style={styles.miniAction} onPress={handleMyServices}>
                        <Briefcase size={18} color={colors.textSecondary} />
                        <Text style={[styles.miniActionLabel, { color: colors.textSecondary }]}>{t('portal.servicesHome.mini.library')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search - Floating Style */}
            <View style={styles.searchSection}>
                <View
                    style={[
                        styles.searchBackground,
                        { backgroundColor: colors.surface },
                        isAndroidReducedEffects && styles.searchBackgroundReducedAndroid,
                    ]}
                >
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder={t('portal.servicesHome.searchPlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Categories - Round Style */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.key}
                        style={styles.categoryCircleItem}
                        onPress={() => setSelectedCategory(cat.key)}
                    >
                        {isAndroidReducedEffects ? (
                            <View
                                style={[
                                    styles.categoryCircle,
                                    {
                                        backgroundColor: selectedCategory === cat.key
                                            ? roleTheme.accent
                                            : 'rgba(255,255,255,0.04)',
                                    },
                                ]}
                            >
                                <CategoryIcon
                                    name={cat.iconName}
                                    size={22}
                                    color={selectedCategory === cat.key ? colors.textPrimary : colors.textSecondary}
                                />
                            </View>
                        ) : (
                            <LinearGradient
                                colors={selectedCategory === cat.key
                                    ? [roleTheme.accent, roleTheme.accentStrong]
                                    : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                style={styles.categoryCircle}
                            >
                                <CategoryIcon
                                    name={cat.iconName}
                                    size={22}
                                    color={selectedCategory === cat.key ? colors.textPrimary : colors.textSecondary}
                                />
                            </LinearGradient>
                        )}
                        <Text style={[
                            styles.categoryCircleLabel,
                            { color: colors.textSecondary },
                            selectedCategory === cat.key && styles.activeCategoryLabel
                        ]}>
                            {t(cat.labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Search size={40} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('portal.servicesHome.empty.title')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {t('portal.servicesHome.empty.subtitle')}
            </Text>
            <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                onPress={handleCreateService}
            >
                <Text style={[styles.emptyButtonText, { color: colors.textPrimary }]}>{t('portal.servicesHome.empty.create')}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFooter = () => {
        if (!hasMore || services.length === 0 || !loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    };

    return (
        <View
            style={[
                styles.gradient,
                { backgroundColor: isAndroidReducedEffects ? roleTheme.gradient[0] : 'transparent' },
            ]}
        >
            {!isAndroidReducedEffects && (
                <LinearGradient
                    colors={roleTheme.gradient}
                    style={StyleSheet.absoluteFill}
                />
            )}
            <View style={styles.container}>
                <GodModeStatusBanner />

                {loading && services.length === 0 ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <ServicesListComponent
                        data={services}
                        keyExtractor={(item: Service) => item.id.toString()}
                        renderItem={renderServiceItem}
                        numColumns={isAndroidReducedEffects ? 1 : 2}
                        key={isAndroidReducedEffects ? 'services-flat-1col' : 'services-grid-2col'}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={renderHeader}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.accent}
                            />
                        }
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={renderEmpty}
                        ListFooterComponent={renderFooter}
                        {...listTuningProps}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        marginBottom: 24,
    },
    bannerHeader: {
        width: '100%',
        height: 240,
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
    },
    bannerImage: {
        resizeMode: 'cover',
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '900',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 12,
    },
    headerTitleReducedAndroid: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 4,
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    headerSubtitleReducedAndroid: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    walletButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    walletInnerGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
    },
    walletBalanceGlass: {
        fontSize: 13,
        fontWeight: '800',
    },
    featuredActions: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    featuredCard: {
        flex: 1,
        height: 100,
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    featuredCardReducedAndroid: {
        borderWidth: 0.5,
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    actionIconOuter: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featuredCardTitle: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'right',
    },
    featuredCardSub: {
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'right',
        marginTop: 2,
    },
    miniAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
    },
    miniActionLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
    },
    miniDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    searchSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    searchBackground: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    searchBackgroundReducedAndroid: {
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    categoriesContainer: {
        paddingLeft: 20,
        paddingRight: 10,
        paddingBottom: 24,
    },
    categoryCircleItem: {
        alignItems: 'center',
        marginRight: 20,
        width: 70,
    },
    categoryCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    categoryCircleLabel: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    activeCategoryLabel: {
        color: 'rgba(245,158,11,1)',
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 18,
    },
    listContent: {
        paddingBottom: 40,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    emptyButton: {
        backgroundColor: 'rgba(245,158,11,1)',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 20,
        shadowColor: 'rgba(245,158,11,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
    },
    emptyButtonText: {
        color: 'rgba(26,26,46,1)',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footerLoader: {
        paddingVertical: 30,
    },
});

export default ServicesHomeScreen;
