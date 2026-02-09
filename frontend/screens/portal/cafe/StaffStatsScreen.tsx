import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Users,
    ShoppingBag,
    DollarSign,
    Clock,
    Calendar,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { cafeService } from '../../../services/cafeService';
import { OrderStatsResponse } from '../../../types/cafe';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const { width } = Dimensions.get('window');

const StaffStatsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'StaffStats'>>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const { cafeId, cafeName } = route.params;
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [stats, setStats] = useState<OrderStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

    useEffect(() => {
        loadStats();
    }, [cafeId]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await cafeService.getOrderStats(cafeId);
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStatCard = (title: string, value: string | number, icon: any, color: string, trend?: string) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                {React.createElement(icon, { size: 24, color: color })}
            </View>
            <View style={styles.statInfo}>
                <Text style={styles.statTitle}>{title}</Text>
                <Text style={styles.statValue}>{value}</Text>
                {trend && (
                    <View style={styles.trendContainer}>
                        {trend.startsWith('+') ? (
                            <TrendingUp size={14} color={colors.success} />
                        ) : (
                            <TrendingDown size={14} color={colors.danger} />
                        )}
                        <Text style={[styles.trendText, { color: trend.startsWith('+') ? colors.success : colors.danger }]}>
                            {trend}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{t('cafe.dashboard.stats')}</Text>
                    <Text style={styles.headerSubtitle}>{cafeName}</Text>
                </View>
                <TouchableOpacity style={styles.calendarButton}>
                    <Calendar size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Time Range Selector */}
                <View style={styles.rangeSelector}>
                    {(['today', 'week', 'month'] as const).map(range => (
                        <TouchableOpacity
                            key={range}
                            style={[styles.rangeTab, timeRange === range && styles.activeRangeTab]}
                            onPress={() => setTimeRange(range)}
                        >
                            <Text style={[styles.rangeTabText, timeRange === range && styles.activeRangeTabText]}>
                                {t(`common.ranges.${range}`) || range}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Main Stats Grid */}
                <View style={styles.statsGrid}>
                    {renderStatCard(
                        t('cafe.dashboard.todayRevenue'),
                        `${stats?.todayRevenue || 0} ₽`,
                        DollarSign,
                        colors.success,
                        '+12.5%'
                    )}
                    {renderStatCard(
                        t('cafe.dashboard.todayOrders'),
                        stats?.todayOrders || 0,
                        ShoppingBag,
                        colors.accent,
                        '+5.2%'
                    )}
                    {renderStatCard(
                        t('cafe.stats.totalCustomers') || 'Customers',
                        '124',
                        Users,
                        colors.warning,
                        '-2.4%'
                    )}
                    {renderStatCard(
                        t('cafe.dashboard.avgTime'),
                        `${stats?.avgPrepTime || 0} ${t('common.min')}`,
                        Clock,
                        colors.textSecondary
                    )}
                </View>

                {/* Chart Mockup */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>{t('cafe.stats.revenueOverTime') || 'Revenue Overview'}</Text>
                    <View style={styles.chartContainer}>
                        <LinearGradient
                            colors={[colors.accentSoft, 'transparent']}
                            style={styles.chartGradient}
                        />
                        <View style={styles.chartBars}>
                            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                <View key={i} style={styles.barContainer}>
                                    <View style={[styles.bar, { height: `${h}%` }]} />
                                    <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 48,
        paddingBottom: 20,
        paddingHorizontal: 16,
        backgroundColor: colors.surfaceElevated,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    calendarButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    rangeSelector: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceElevated,
        margin: 16,
        padding: 4,
        borderRadius: 12,
    },
    rangeTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeRangeTab: {
        backgroundColor: colors.surface,
    },
    rangeTabText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    activeRangeTabText: {
        color: colors.textPrimary,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 10,
    },
    statCard: {
        width: (width - 40) / 2,
        backgroundColor: colors.surfaceElevated,
        margin: 5,
        padding: 16,
        borderRadius: 16,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statInfo: {
        gap: 4,
    },
    statTitle: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    statValue: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
    },
    chartSection: {
        padding: 16,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    chartContainer: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        height: 200,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    chartGradient: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        height: 100,
    },
    chartBars: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    barContainer: {
        alignItems: 'center',
        width: 30,
    },
    bar: {
        width: 12,
        backgroundColor: colors.accent,
        borderRadius: 6,
        minHeight: 4,
    },
    barLabel: {
        color: colors.textSecondary,
        fontSize: 10,
        marginTop: 10,
    },
});

export default StaffStatsScreen;
