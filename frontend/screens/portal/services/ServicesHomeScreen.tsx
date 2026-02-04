/**
 * ServicesHomeScreen - Главный экран сервисов
 */
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    ArrowLeft,
    Search,
    Briefcase,
    PlusCircle,
    Wallet,
    History,
    Users,
    Star,
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
    ServiceCategory,
    ServiceFilters,
    getServices,
} from '../../../services/serviceService';
import { useWallet } from '../../../context/WalletContext';
import ServiceCard from './components/ServiceCard';

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

export default function ServicesHomeScreen() {
    const navigation = useNavigation<any>();
    const { formattedBalance } = useWallet();

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadServices = useCallback(async (reset = false) => {
        try {
            const filters: ServiceFilters = {
                page: reset ? 1 : page,
                limit: 20,
            };

            if (selectedCategory !== 'all') {
                filters.category = selectedCategory;
            }

            if (searchQuery.trim()) {
                filters.search = searchQuery.trim();
            }

            const response = await getServices(filters);

            if (reset) {
                setServices(response.services);
                setPage(1);
            } else {
                setServices(prev => [...prev, ...response.services]);
            }

            setHasMore(response.page < response.totalPages);
        } catch (error) {
            console.error('Failed to load services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCategory, searchQuery, page]);

    useEffect(() => {
        setLoading(true);
        loadServices(true);
    }, [selectedCategory, searchQuery]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadServices(true);
    }, [loadServices]);

    const onLoadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
            loadServices();
        }
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

    const handleWallet = () => {
        navigation.navigate('Wallet');
    };

    const renderHeader = () => (
        <View style={styles.header}>
            {/* Top Bar */}
            <View style={styles.headerTop}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Маркетплейс</Text>
                    <Text style={styles.headerSubtitle}>Услуги и специалисты</Text>
                </View>

                <TouchableOpacity style={styles.walletButton} onPress={handleWallet}>
                    <LinearGradient
                        colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)']}
                        style={styles.walletInner}
                    >
                        <Wallet size={14} color="#F59E0B" />
                        <Text style={styles.walletBalance}>{formattedBalance}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Featured Actions - Premium Cards */}
            <View style={styles.featuredActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: '#1e1e3a', borderColor: 'rgba(245, 158, 11, 0.2)' }]}
                        onPress={handleCreateService}
                    >
                        <LinearGradient
                            colors={['rgba(245, 158, 11, 0.15)', 'transparent']}
                            style={styles.cardGradient}
                        />
                        <View style={styles.actionIconOuter}>
                            <PlusCircle size={24} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={styles.featuredCardTitle}>Создать</Text>
                            <Text style={styles.featuredCardSub}>Свою услугу</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: '#1a1a2e', borderColor: 'rgba(255,255,255,0.05)' }]}
                        onPress={handleIncomingBookings}
                    >
                        <View style={styles.actionIconOuter}>
                            <Users size={24} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.featuredCardTitle}>Заказы</Text>
                            <Text style={styles.featuredCardSub}>Ваши клиенты</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionRow, { marginTop: 12 }]}>
                    <TouchableOpacity style={styles.miniAction} onPress={handleMyBookings}>
                        <History size={18} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.miniActionLabel}>Мои записи</Text>
                    </TouchableOpacity>
                    <View style={styles.miniDivider} />
                    <TouchableOpacity style={styles.miniAction} onPress={handleMyServices}>
                        <Briefcase size={18} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.miniActionLabel}>Библиотека</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search - Floating Style */}
            <View style={styles.searchSection}>
                <View style={styles.searchBackground}>
                    <Search size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Кого вы ищете сегодня?"
                        placeholderTextColor="rgba(255,255,255,0.3)"
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
                                ? ['#F59E0B', '#D97706']
                                : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                            style={styles.categoryCircle}
                        >
                            <CategoryIcon
                                name={cat.iconName}
                                size={22}
                                color={selectedCategory === cat.key ? '#fff' : 'rgba(255,255,255,0.6)'}
                            />
                        </LinearGradient>
                        <Text style={[
                            styles.categoryCircleLabel,
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
                <Search size={40} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.emptyTitle}>Услуги не найдены</Text>
            <Text style={styles.emptySubtitle}>
                Попробуйте изменить категорию или уточнить запрос
            </Text>
            <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleCreateService}
            >
                <Text style={styles.emptyButtonText}>Создать первую услугу</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFooter = () => {
        if (!hasMore || services.length === 0) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator color="#FFD700" />
            </View>
        );
    };

    return (
        <LinearGradient
            colors={['#0a0a14', '#12122b']}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                {renderHeader()}

                {loading && services.length === 0 ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#FFD700" />
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
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#FFD700"
                            />
                        }
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={renderEmpty}
                        ListFooterComponent={renderFooter}
                    />
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
    header: {
        paddingTop: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 2,
    },
    walletButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    walletInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 20,
    },
    walletBalance: {
        color: '#F59E0B',
        fontSize: 14,
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
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'right',
    },
    featuredCardSub: {
        color: 'rgba(255,255,255,0.4)',
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
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
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
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    activeCategoryLabel: {
        color: '#F59E0B',
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
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    emptyButton: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 20,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
    },
    emptyButtonText: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footerLoader: {
        paddingVertical: 30,
    },
});
