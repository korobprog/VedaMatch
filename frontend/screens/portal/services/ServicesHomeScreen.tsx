/**
 * ServicesHomeScreen - Главный экран сервисов
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    Dimensions,
    ActivityIndicator,
    ImageBackground,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
    ServiceFilters,
    getServices,
} from '../../../services/serviceService';
import ServiceCard from './components/ServiceCard';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';
import { BalancePill } from '../../../components/wallet/BalancePill';
import { AssistantChatButton } from '../../../components/portal/AssistantChatButton';

const { width } = Dimensions.get('window');

const CATEGORIES: { key: ServiceCategory | 'all'; label: string; iconName: string }[] = [
    { key: 'all', label: 'Все', iconName: 'Sparkles' },
    { key: 'astrology', label: 'Астрология', iconName: 'Star' },
    { key: 'psychology', label: 'Психология', iconName: 'Brain' },
    { key: 'coaching', label: 'Коучинг', iconName: 'Target' },
    { key: 'spirituality', label: 'Духовность', iconName: 'Infinity' },
    { key: 'yagya', label: 'Ягьи', iconName: 'Flame' },
    { key: 'education', label: 'Обучение', iconName: 'BookOpen' },
    { key: 'health', label: 'Здоровье', iconName: 'Leaf' },
    { key: 'other', label: 'Другое', iconName: 'Sparkles' },
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
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const loadMoreInProgressRef = useRef(false);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            loadMoreInProgressRef.current = false;
        };
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const loadServices = useCallback(async ({ reset = false, pageOverride }: { reset?: boolean; pageOverride?: number } = {}) => {
        const requestId = ++latestLoadRequestRef.current;
        const targetPage = pageOverride ?? 1;
        if (reset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        try {
            const filters: ServiceFilters = {
                page: targetPage,
                limit: 20,
            };

            if (selectedCategory !== 'all') {
                filters.category = selectedCategory;
            }

            const normalizedSearch = debouncedSearchQuery.trim();
            if (normalizedSearch) {
                filters.search = normalizedSearch;
            }

            const response = await getServices(filters);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }

            if (reset) {
                setServices(response.services);
                setPage(1);
            } else {
                setServices(prev => {
                    const seen = new Set(prev.map(item => item.id));
                    const unique = response.services.filter(item => !seen.has(item.id));
                    return [...prev, ...unique];
                });
                setPage(targetPage);
            }

            setHasMore(response.page < response.totalPages);
        } catch (error) {
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.error('Failed to load services:', error);
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
            loadMoreInProgressRef.current = false;
        }
    }, [selectedCategory, debouncedSearchQuery]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        loadServices({ reset: true, pageOverride: 1 });
    }, [selectedCategory, debouncedSearchQuery, loadServices]);

    const onRefresh = useCallback(() => {
        if (refreshing || loading) {
            return;
        }
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        void loadServices({ reset: true, pageOverride: 1 });
    }, [refreshing, loading, loadServices]);

    const onLoadMore = () => {
        if (loading || refreshing || loadingMore || !hasMore || loadMoreInProgressRef.current) return;
        loadMoreInProgressRef.current = true;
        const nextPage = page + 1;
        void loadServices({ reset: false, pageOverride: nextPage });
    };

    const handleServicePress = (service: Service) => {
        navigation.navigate('ServiceDetail', { serviceId: service.id });
    };

    const handleCreateService = () => {
        navigation.navigate('CreateService');
    };

    const handleMyServices = () => {
        navigation.navigate('MyServices');
    };

    const handleMyBookings = () => {
        navigation.navigate('MyBookings');
    };

    const handleIncomingBookings = () => {
        navigation.navigate('IncomingBookings');
    };

    const handleChannels = () => {
        navigation.navigate('ChannelsHub');
    };

    const renderHeader = () => (
        <View style={styles.header}>
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
                            Маркетплейс
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Услуги и специалисты</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <AssistantChatButton />
                        <BalancePill size="small" lightMode={true} />
                    </View>
                </View>
            </ImageBackground>

            {/* Featured Actions - Premium Cards */}
            <View style={styles.featuredActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.accentSoft }]}
                        onPress={handleCreateService}
                    >
                        <LinearGradient
                            colors={[roleTheme.accentSoft, 'transparent']}
                            style={styles.cardGradient}
                        />
                        <View style={styles.actionIconOuter}>
                            <PlusCircle size={24} color={colors.accent} />
                        </View>
                        <View>
                            <Text style={[styles.featuredCardTitle, { color: colors.textPrimary }]}>Создать</Text>
                            <Text style={[styles.featuredCardSub, { color: colors.textSecondary }]}>Свою услугу</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={handleIncomingBookings}
                    >
                        <View style={styles.actionIconOuter}>
                            <Users size={24} color={colors.textPrimary} />
                        </View>
                        <View>
                            <Text style={[styles.featuredCardTitle, { color: colors.textPrimary }]}>Заказы</Text>
                            <Text style={[styles.featuredCardSub, { color: colors.textSecondary }]}>Ваши клиенты</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionRow, { marginTop: 12 }]}>
                    <TouchableOpacity style={styles.miniAction} onPress={handleMyBookings}>
                        <History size={18} color={colors.textSecondary} />
                        <Text style={[styles.miniActionLabel, { color: colors.textSecondary }]}>Мои записи</Text>
                    </TouchableOpacity>
                    <View style={styles.miniDivider} />
                    <TouchableOpacity style={styles.miniAction} onPress={handleChannels}>
                        <Radio size={18} color={colors.textSecondary} />
                        <Text style={[styles.miniActionLabel, { color: colors.textSecondary }]}>Каналы</Text>
                    </TouchableOpacity>
                    <View style={styles.miniDivider} />
                    <TouchableOpacity style={styles.miniAction} onPress={handleMyServices}>
                        <Briefcase size={18} color={colors.textSecondary} />
                        <Text style={[styles.miniActionLabel, { color: colors.textSecondary }]}>Библиотека</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search - Floating Style */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBackground, { backgroundColor: colors.surface }]}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Кого вы ищете сегодня?"
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
                        <Text style={[
                            styles.categoryCircleLabel,
                            { color: colors.textSecondary },
                            selectedCategory === cat.key && styles.activeCategoryLabel
                        ]}>
                            {cat.label}
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
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Услуги не найдены</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Попробуйте изменить категорию или уточнить запрос
            </Text>
            <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                onPress={handleCreateService}
            >
                <Text style={[styles.emptyButtonText, { color: colors.textPrimary }]}>Создать первую услугу</Text>
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
        <LinearGradient
            colors={roleTheme.gradient}
            style={styles.gradient}
        >
            <View style={styles.container}>
                <GodModeStatusBanner />

                {loading && services.length === 0 ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <FlatList
                        data={services}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <ServiceCard service={item} onPress={handleServicePress} />
                        )}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
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
                    />
                )}
            </View>
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
