/**
 * WalletScreen - Экран кошелька Лакшми
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    ArrowLeft,
    ArrowDown,
    ArrowUp,
    ArrowDownCircle,
    ArrowUpCircle,
    History as HistoryIcon,
    Wallet as WalletIcon,
    TrendingUp,
    MoreHorizontal
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import {
    WalletTransaction,
    getTransactions,
    getWalletStats,
    WalletStatsResponse,
    TRANSACTION_TYPE_LABELS,
    TRANSACTION_TYPE_COLORS,
    formatTransactionAmount,
    formatTransactionDate,
    CURRENCY_NAME,
    CURRENCY_CODE,
    getTransactionSign,
} from '../../services/walletService';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
    const navigation = useNavigation<any>();
    const { wallet, refreshWallet, loading: walletLoading } = useWallet();

    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [stats, setStats] = useState<WalletStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [txResponse, statsResponse] = await Promise.all([
                getTransactions({ limit: 50 }),
                getWalletStats(),
            ]);
            setTransactions(txResponse.transactions);
            setStats(statsResponse);
        } catch (error) {
            console.error('Failed to load wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refreshWallet(), loadData()]);
    }, [refreshWallet, loadData]);

    const renderTransaction = (item: WalletTransaction) => {
        const sign = getTransactionSign(item.type);
        const color = TRANSACTION_TYPE_COLORS[item.type];

        return (
            <TouchableOpacity key={item.id} style={styles.transactionItem} activeOpacity={0.7}>
                <View style={[styles.transactionIcon, { backgroundColor: `${color}15` }]}>
                    {sign === '+' ? (
                        <ArrowDown size={18} color={color} />
                    ) : (
                        <ArrowUp size={18} color={color} />
                    )}
                </View>
                <View style={styles.transactionContent}>
                    <Text style={styles.transactionType}>
                        {TRANSACTION_TYPE_LABELS[item.type]}
                    </Text>
                    <Text style={styles.transactionDate}>
                        {formatTransactionDate(item.createdAt)}
                    </Text>
                </View>
                <View style={styles.transactionAmountContainer}>
                    <Text style={[styles.transactionAmount, { color }]}>
                        {formatTransactionAmount(item.type, item.amount)}
                    </Text>
                    <Text style={styles.transactionCurrency}>{CURRENCY_CODE}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <LinearGradient
            colors={['#0a0a14', '#12122b', '#0a0a14']}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Кошелёк</Text>
                        <Text style={styles.headerSubtitle}>Управление балансом</Text>
                    </View>
                    <TouchableOpacity style={styles.headerAction}>
                        <MoreHorizontal size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                    </View>
                ) : (
                    <ScrollView
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#F59E0B"
                            />
                        }
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Immersive Balance Section */}
                        <View style={styles.balanceSection}>
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.balanceCard}
                            >
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.25)', 'transparent']}
                                    style={styles.balanceCardShimmer}
                                />
                                <View style={styles.balanceTop}>
                                    <View style={styles.balanceLabelRow}>
                                        <WalletIcon size={14} color="rgba(26,26,46,0.6)" />
                                        <Text style={styles.balanceLabel}>{CURRENCY_NAME}</Text>
                                    </View>
                                    <View style={styles.currencyBadge}>
                                        <Text style={styles.currencyBadgeText}>{CURRENCY_CODE}</Text>
                                    </View>
                                </View>
                                <View style={styles.balanceValueContainer}>
                                    <Text style={styles.balanceValue}>
                                        {wallet?.balance.toLocaleString('ru-RU') || 0}
                                    </Text>
                                </View>

                                <View style={styles.balanceFooter}>
                                    <View style={styles.balanceStatRow}>
                                        <View style={styles.miniIconCircle}>
                                            <ArrowDown size={10} color="#1a1a2e" />
                                        </View>
                                        <View>
                                            <Text style={styles.balanceStatLabel}>Получено</Text>
                                            <Text style={styles.balanceStatValue}>
                                                {stats?.totalEarned.toLocaleString('ru-RU') || 0}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.balanceStatDivider} />
                                    <View style={styles.balanceStatRow}>
                                        <View style={styles.miniIconCircle}>
                                            <ArrowUp size={10} color="#1a1a2e" />
                                        </View>
                                        <View>
                                            <Text style={styles.balanceStatLabel}>Потрачено</Text>
                                            <Text style={styles.balanceStatValue}>
                                                {stats?.totalSpent.toLocaleString('ru-RU') || 0}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>

                        {/* Stats & Actions */}
                        <View style={styles.statsSection}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.titleRow}>
                                    <TrendingUp size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                                    <Text style={styles.sectionTitle}>Аналитика</Text>
                                </View>
                                <Text style={styles.sectionPeriod}>Текущий месяц</Text>
                            </View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statCard}>
                                    <View style={[styles.statIconCircle, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                                        <ArrowDownCircle size={20} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.statCardLabel}>Доход</Text>
                                    <Text style={[styles.statCardValue, { color: '#4CAF50' }]}>
                                        +{stats?.thisMonthIn.toLocaleString('ru-RU') || 0}
                                    </Text>
                                </View>

                                <View style={styles.statCard}>
                                    <View style={[styles.statIconCircle, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                        <ArrowUpCircle size={20} color="#F44336" />
                                    </View>
                                    <Text style={styles.statCardLabel}>Расход</Text>
                                    <Text style={[styles.statCardValue, { color: '#F44336' }]}>
                                        -{stats?.thisMonthOut.toLocaleString('ru-RU') || 0}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Transaction History */}
                        <View style={styles.historySection}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.titleRow}>
                                    <HistoryIcon size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                                    <Text style={styles.historyTitle}>История операций</Text>
                                </View>
                            </View>

                            {transactions.length === 0 ? (
                                <View style={styles.emptyHistory}>
                                    <View style={styles.emptyIconCircle}>
                                        <HistoryIcon size={32} color="rgba(245, 158, 11, 0.2)" />
                                    </View>
                                    <Text style={styles.emptyText}>У вас пока нет транзакций</Text>
                                </View>
                            ) : (
                                <View style={styles.historyList}>
                                    {transactions.map((tx) => renderTransaction(tx))}
                                </View>
                            )}
                        </View>
                    </ScrollView>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    balanceSection: {
        marginBottom: 32,
    },
    balanceCard: {
        width: '100%',
        borderRadius: 32,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    balanceCardShimmer: {
        ...StyleSheet.absoluteFillObject,
        height: '100%',
        width: '200%',
    },
    balanceTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    balanceLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    balanceLabel: {
        color: 'rgba(26, 26, 46, 0.5)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    currencyBadge: {
        backgroundColor: 'rgba(26, 26, 46, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    currencyBadgeText: {
        color: '#1a1a2e',
        fontSize: 10,
        fontWeight: '900',
    },
    balanceValueContainer: {
        marginBottom: 24,
    },
    balanceValue: {
        color: '#1a1a2e',
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: -1,
    },
    balanceFooter: {
        flexDirection: 'row',
        backgroundColor: 'rgba(26, 26, 46, 0.08)',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
    },
    balanceStatRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    miniIconCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(26, 26, 46, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceStatValue: {
        color: '#1a1a2e',
        fontSize: 14,
        fontWeight: '800',
    },
    balanceStatLabel: {
        color: 'rgba(26, 26, 46, 0.5)',
        fontSize: 10,
        fontWeight: '600',
    },
    balanceStatDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(26, 26, 46, 0.1)',
        marginHorizontal: 12,
    },
    statsSection: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
    },
    sectionPeriod: {
        color: 'rgba(255, 215, 0, 0.5)',
        fontSize: 11,
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    statIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statCardLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    statCardValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    historySection: {
        flex: 1,
    },
    historyTitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
    },
    historyList: {
        marginTop: 4,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    transactionIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionContent: {
        flex: 1,
        marginLeft: 15,
    },
    transactionType: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    transactionDate: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        marginTop: 2,
        fontWeight: '500',
    },
    transactionAmountContainer: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '800',
    },
    transactionCurrency: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 10,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 13,
        fontWeight: '600',
    },
});
