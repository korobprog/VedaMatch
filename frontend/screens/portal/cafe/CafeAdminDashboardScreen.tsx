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
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    Coffee,
    Receipt,
    Banknote,
    Clock,
    Hourglass,
    Hand,
    MinusCircle,
    Grid3X3,
    UtensilsCrossed,
    BarChart3,
    Settings,
    ChevronRight,
    Zap,
    LayoutDashboard
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import {
    Cafe,
    OrderStatsResponse,
} from '../../../types/cafe';
import { RootStackParamList } from '../../../types/navigation';

const { width } = Dimensions.get('window');

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

            if (!targetId) {
                const myCafeResponse = await cafeService.getMyCafe();
                if (myCafeResponse.hasCafe && myCafeResponse.cafe && myCafeResponse.cafe.id) {
                    targetId = myCafeResponse.cafe.id;
                }
            }

            if (!targetId) {
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
            color: '#F59E0B',
            route: 'StaffOrderBoard',
            badge: stats?.pendingOrders,
        },
        {
            id: 'waiter',
            label: t('cafe.dashboard.calls'),
            icon: 'hand-left',
            color: '#F59E0B',
            route: 'StaffWaiterCalls',
        },
        {
            id: 'stoplist',
            label: t('cafe.dashboard.stopList'),
            icon: 'remove-circle',
            color: '#EF4444',
            route: 'StaffStopList',
        },
        {
            id: 'tables',
            label: t('cafe.dashboard.tables'),
            icon: 'grid',
            color: '#F59E0B',
            route: 'StaffTableEditor',
        },
        {
            id: 'menu',
            label: t('cafe.dashboard.menu'),
            icon: 'restaurant',
            color: '#F59E0B',
            route: 'StaffMenuEditor',
        },
        {
            id: 'history',
            label: t('cafe.dashboard.history'),
            icon: 'time',
            color: 'rgba(255,255,255,0.4)',
            route: 'StaffOrderHistory',
        },
        {
            id: 'stats',
            label: t('cafe.dashboard.stats'),
            icon: 'bar-chart',
            color: '#F59E0B',
            route: 'StaffStats',
        },
        {
            id: 'settings',
            label: t('cafe.dashboard.settings'),
            icon: 'settings',
            color: 'rgba(255,255,255,0.4)',
            route: 'CafeSettings',
        },
    ];

    const handleQuickAction = (action: QuickAction) => {
        if (!cafe) return;
        navigation.navigate(action.route, { cafeId: cafe.id, cafeName: cafe.name });
    };

    const renderActionIcon = (iconName: string, color: string) => {
        const iconProps = { size: 22, color };
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
            <LinearGradient colors={['#0a0a14', '#12122b']} style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#F59E0B" />
            </LinearGradient>
        );
    }

    if (!cafe) {
        return (
            <LinearGradient colors={['#0a0a14', '#12122b']} style={styles.centerContainer}>
                <LayoutDashboard size={48} color="rgba(255,255,255,0.1)" />
                <Text style={styles.errorText}>{t('cafe.dashboard.notFound')}</Text>
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0a0a14', '#12122b']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.dashboard.title', 'Дашборд')}</Text>
                <View style={{ width: 44 }} />
            </SafeAreaView>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Cafe Header Card */}
                <View style={styles.cafeCardGlass}>
                    <View style={styles.cafeInfoRow}>
                        <View style={styles.logoWrapper}>
                            {cafe.logoUrl ? (
                                <Image source={{ uri: cafe.logoUrl }} style={styles.logoImg} />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <Coffee size={28} color="#F59E0B" />
                                </View>
                            )}
                            <View style={[
                                styles.statusPill,
                                { backgroundColor: cafe.status === 'active' ? '#10B981' : '#F59E0B' }
                            ]} />
                        </View>
                        <View style={styles.cafeMeta}>
                            <Text style={styles.cafeName}>{cafe.name}</Text>
                            <Text style={styles.cafeStatus}>
                                {cafe.status === 'active' ? t('cafe.dashboard.activeStatus') : t('cafe.dashboard.inactiveStatus')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stats Grid */}
                {stats && (
                    <View style={styles.statsStrip}>
                        <View style={styles.statsRow}>
                            <View style={styles.glassStat}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                    <Receipt size={18} color="#F59E0B" />
                                </View>
                                <Text style={styles.statValue}>{stats.todayOrders}</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.todayOrders')}</Text>
                            </View>
                            <View style={styles.glassStat}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Banknote size={18} color="#10B981" />
                                </View>
                                <Text style={styles.statValue}>{stats.todayRevenue} ₽</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.todayRevenue')}</Text>
                            </View>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.glassStat}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                    <Clock size={18} color="#3B82F6" />
                                </View>
                                <Text style={styles.statValue}>~{stats.avgPrepTime} {t('common.min')}</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.avgTime')}</Text>
                            </View>
                            <View style={styles.glassStat}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                    <Hourglass size={18} color="#F59E0B" />
                                </View>
                                <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                                <Text style={styles.statLabel}>{t('cafe.dashboard.activeOrders')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Quick Order Entry */}
                <TouchableOpacity
                    style={styles.lightningBtn}
                    onPress={() => navigation.navigate('StaffOrderBoard', { cafeId: cafe.id, cafeName: cafe.name })}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.05)']}
                        style={styles.lightningGradient}
                    >
                        <View style={styles.lightningIconBox}>
                            <Zap size={24} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.lightningTitle}>{t('cafe.dashboard.openOrderBoard')}</Text>
                            <Text style={styles.lightningSubtitle}>
                                {t('cafe.dashboard.activeOrdersCount', { count: stats?.pendingOrders || 0 })}
                            </Text>
                        </View>
                        <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Actions Grid */}
                <View style={styles.actionsBox}>
                    <Text style={styles.boxTitle}>{t('cafe.dashboard.management')}</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map(action => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionItem}
                                onPress={() => handleQuickAction(action)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.actionIconBox}>
                                    {renderActionIcon(action.icon, action.color)}
                                    {!!action.badge && action.badge > 0 && (
                                        <View style={styles.actionBadge}>
                                            <Text style={styles.actionBadgeText}>{action.badge}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        marginTop: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    cafeCardGlass: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 20,
    },
    cafeInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    logoWrapper: {
        position: 'relative',
    },
    logoImg: {
        width: 64,
        height: 64,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    logoPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statusPill: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#1a1a2e',
    },
    cafeMeta: {
        flex: 1,
    },
    cafeName: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 4,
    },
    cafeStatus: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: '600',
    },
    statsStrip: {
        gap: 12,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    glassStat: {
        flex: 1,
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    lightningBtn: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        marginBottom: 20,
    },
    lightningGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    lightningIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F59E0B',
        shadowRadius: 10,
        shadowOpacity: 0.3,
    },
    lightningTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    lightningSubtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: '600',
    },
    actionsBox: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    boxTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    actionItem: {
        width: (width - 120) / 4,
        alignItems: 'center',
    },
    actionIconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
    },
    actionBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 8,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#1a1a2e',
    },
    actionBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
    },
    actionLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 8,
        textAlign: 'center',
    }
});

export default CafeAdminDashboardScreen;
