import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Coffee, Receipt, Banknote, Clock, Hourglass, Hand, MinusCircle, Grid3X3, UtensilsCrossed, BarChart3, Settings, ChevronRight, Zap } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import {
    Cafe,
    OrderStatsResponse,
} from '../../../types/cafe';
import { RootStackParamList } from '../../../types/navigation';

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    color: string;
    route: string;
    badge?: number;
}

const CafeAdminDashboardScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'EditCafe'>>();
    const { t } = useTranslation();
    const { cafeId } = route.params || {};

    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [stats, setStats] = useState<OrderStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [cafeId]);

    const loadData = async () => {
        try {
            setLoading(true);
            let targetId = cafeId;

            // If cafeId is not in params, try to get user's cafe
            if (!targetId) {
                console.log('[CafeAdminDashboard] No cafeId in params, fetching user\'s cafe...');
                const myCafeResponse = await cafeService.getMyCafe();
                console.log('[CafeAdminDashboard] getMyCafe response:', myCafeResponse);
                if (myCafeResponse.hasCafe && myCafeResponse.cafe && myCafeResponse.cafe.id) {
                    targetId = myCafeResponse.cafe.id;
                    console.log('[CafeAdminDashboard] Found user cafe with id:', targetId);
                }
            }

            if (!targetId) {
                console.log('[CafeAdminDashboard] No cafe found for current user');
                setLoading(false);
                return;
            }

            const [cafeData, statsData] = await Promise.all([
                cafeService.getCafeById(targetId),
                cafeService.getOrderStats(targetId),
            ]);
            setCafe(cafeData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            Alert.alert(t('common.error'), t('cafe.dashboard.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const quickActions: QuickAction[] = [
        {
            id: 'orders',
            label: t('cafe.dashboard.orders'),
            icon: 'receipt',
            color: '#FF6B00',
            route: 'StaffOrderBoard',
            badge: stats?.pendingOrders,
        },
        {
            id: 'waiter',
            label: t('cafe.dashboard.calls'),
            icon: 'hand-left',
            color: '#FF9500',
            route: 'StaffWaiterCalls',
        },
        {
            id: 'stoplist',
            label: t('cafe.dashboard.stopList'),
            icon: 'remove-circle',
            color: '#FF3B30',
            route: 'StaffStopList',
        },
        {
            id: 'tables',
            label: t('cafe.dashboard.tables'),
            icon: 'grid',
            color: '#007AFF',
            route: 'StaffTableEditor',
        },
        {
            id: 'menu',
            label: t('cafe.dashboard.menu'),
            icon: 'restaurant',
            color: '#34C759',
            route: 'StaffMenuEditor',
        },
        {
            id: 'history',
            label: t('cafe.dashboard.history'),
            icon: 'time',
            color: '#8E8E93',
            route: 'StaffOrderHistory',
        },
        {
            id: 'stats',
            label: t('cafe.dashboard.stats'),
            icon: 'bar-chart',
            color: '#5856D6',
            route: 'StaffStats',
        },
        {
            id: 'settings',
            label: t('cafe.dashboard.settings'),
            icon: 'settings',
            color: '#6B7280',
            route: 'CafeSettings',
        },
    ];

    const handleQuickAction = (action: QuickAction) => {
        if (!cafe) return;
        navigation.navigate(action.route, { cafeId: cafe.id, cafeName: cafe.name });
    };

    const renderActionIcon = (iconName: string, color: string) => {
        const iconProps = { size: 24, color };
        switch (iconName) {
            case 'receipt': return <Receipt {...iconProps} />;
            case 'hand-left': return <Hand {...iconProps} />;
            case 'remove-circle': return <MinusCircle {...iconProps} />;
            case 'grid': return <Grid3X3 {...iconProps} />;
            case 'restaurant': return <UtensilsCrossed {...iconProps} />;
            case 'time': return <Clock {...iconProps} />;
            case 'bar-chart': return <BarChart3 {...iconProps} />;
            case 'settings': return <Settings {...iconProps} />;
            default: return <Receipt {...iconProps} />;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    if (!cafe) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('cafe.dashboard.notFound')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header with cafe info */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <ArrowLeft size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.cafeInfo}>
                            {cafe.logoUrl ? (
                                <Image source={{ uri: cafe.logoUrl }} style={styles.cafeLogo} />
                            ) : (
                                <View style={styles.cafeLogoPlaceholder}>
                                    <Coffee size={32} color="#FF6B00" />
                                </View>
                            )}
                            <View style={styles.cafeDetails}>
                                <Text style={styles.cafeName}>{cafe.name}</Text>
                                <View style={styles.statusBadge}>
                                    <View style={[
                                        styles.statusDot,
                                        { backgroundColor: cafe.status === 'active' ? '#34C759' : '#FF9500' }
                                    ]} />
                                    <Text style={styles.statusText}>
                                        {cafe.status === 'active' ? t('cafe.dashboard.activeStatus') : t('cafe.dashboard.inactiveStatus')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stats cards */}
                {stats && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Receipt size={24} color="#FF6B00" />
                                <Text style={styles.statValue}>{stats.todayOrders}</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.todayOrders')}</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Banknote size={24} color="#34C759" />
                                <Text style={styles.statValue}>{stats.todayRevenue} ₽</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.todayRevenue')}</Text>
                            </View>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Clock size={24} color="#007AFF" />
                                <Text style={styles.statValue}>~{stats.avgPrepTime} {t('common.min') || 'мин'}</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.avgTime')}</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Hourglass size={24} color="#FF9500" />
                                <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.activeOrders')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Quick actions grid */}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>{t('cafe.dashboard.management')}</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map(action => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionCard}
                                onPress={() => handleQuickAction(action)}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                                    {renderActionIcon(action.icon, action.color)}
                                    {!!action.badge && action.badge > 0 && (
                                        <View style={styles.badgeContainer}>
                                            <Text style={styles.badgeText}>{action.badge}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick order entry */}
                <TouchableOpacity
                    style={styles.quickOrderButton}
                    onPress={() => navigation.navigate('StaffOrderBoard', { cafeId: cafe.id, cafeName: cafe.name })}
                >
                    <View style={styles.quickOrderContent}>
                        <View style={styles.quickOrderIcon}>
                            <Zap size={28} color="#FFFFFF" />
                        </View>
                        <View>
                            <Text style={styles.quickOrderTitle}>{t('cafe.dashboard.openOrderBoard')}</Text>
                            <Text style={styles.quickOrderSubtitle}>
                                {t('cafe.dashboard.activeOrdersCount', { count: stats?.pendingOrders || 0 })}
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={24} color="#8E8E93" />
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#1C1C1E',
        paddingTop: 48,
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cafeInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cafeLogo: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 12,
    },
    cafeLogoPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cafeDetails: {
        flex: 1,
    },
    cafeName: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        color: '#8E8E93',
        fontSize: 13,
    },
    statsContainer: {
        padding: 16,
        gap: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 8,
    },
    statLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 4,
    },
    actionsSection: {
        padding: 16,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionCard: {
        width: '23%',
        alignItems: 'center',
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badgeContainer: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    actionLabel: {
        color: '#FFFFFF',
        fontSize: 11,
        marginTop: 6,
        textAlign: 'center',
    },
    quickOrderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1C1E',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FF6B00',
    },
    quickOrderContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quickOrderIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    quickOrderTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    quickOrderSubtitle: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 2,
    },
});

export default CafeAdminDashboardScreen;
