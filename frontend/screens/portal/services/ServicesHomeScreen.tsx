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
import { ArrowLeft, Search, X, Calendar, Briefcase, PlusCircle, XCircle } from 'lucide-react-native';
import {
    Service,
    ServiceCategory,
    ServiceFilters,
    getServices,
} from '../../../services/serviceService';
import { useWallet } from '../../../context/WalletContext';
import ServiceCard from './components/ServiceCard';

const { width } = Dimensions.get('window');

const CATEGORIES: { key: ServiceCategory | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: 'Все', icon: '✨' },
    { key: 'astrology', label: 'Астрология', icon: '🌟' },
    { key: 'psychology', label: 'Психология', icon: '🧠' },
    { key: 'coaching', label: 'Коучинг', icon: '🎯' },
    { key: 'spirituality', label: 'Духовность', icon: '🕉️' },
    { key: 'yagya', label: 'Ягьи', icon: '🔥' },
    { key: 'education', label: 'Обучение', icon: '📚' },
    { key: 'health', label: 'Здоровье', icon: '🌿' },
];

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

    const handleWallet = () => {
        navigation.navigate('Wallet');
    };

    const renderHeader = () => (
        <View style={styles.header}>
            {/* Top Row */}
            <View style={styles.headerTop}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Сервисы</Text>

                <TouchableOpacity style={styles.walletButton} onPress={handleWallet}>
                    <Text style={styles.walletIcon}>💰</Text>
                    <Text style={styles.walletBalance}>{formattedBalance}</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleMyBookings}>
                    <Calendar size={20} color="#fff" />
                    <Text style={styles.actionText}>Мои записи</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleMyServices}>
                    <Briefcase size={20} color="#fff" />
                    <Text style={styles.actionText}>Мои сервисы</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.createButton]}
                    onPress={handleCreateService}
                >
                    <PlusCircle size={20} color="#FFD700" />
                    <Text style={[styles.actionText, styles.createText]}>Создать</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Search size={20} color="rgba(255,255,255,0.5)" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Найти сервис..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <XCircle size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.key}
                        style={[
                            styles.categoryChip,
                            selectedCategory === cat.key && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategory(cat.key)}
                    >
                        <Text style={styles.categoryIcon}>{cat.icon}</Text>
                        <Text style={[
                            styles.categoryLabel,
                            selectedCategory === cat.key && styles.categoryLabelActive,
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
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Сервисы не найдены</Text>
            <Text style={styles.emptySubtitle}>
                Попробуйте изменить фильтры или поиск
            </Text>
            <TouchableOpacity
                style={styles.createFirstButton}
                onPress={handleCreateService}
            >
                <Text style={styles.createFirstText}>Создать первый сервис</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFooter = () => {
        if (!hasMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator color="#FFD700" />
            </View>
        );
    };

    return (
        <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
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
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    walletButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    walletIcon: {
        fontSize: 16,
    },
    walletBalance: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '600',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    createButton: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    createText: {
        color: '#FFD700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontSize: 15,
    },
    categoriesContainer: {
        paddingBottom: 4,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        gap: 6,
    },
    categoryChipActive: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    categoryIcon: {
        fontSize: 14,
    },
    categoryLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '500',
    },
    categoryLabelActive: {
        color: '#FFD700',
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    listContent: {
        paddingBottom: 100,
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
    emptyIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    createFirstButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    createFirstText: {
        color: '#1a1a2e',
        fontSize: 14,
        fontWeight: '700',
    },
    footerLoader: {
        paddingVertical: 20,
    },
});
