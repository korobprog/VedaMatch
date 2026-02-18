/**
 * WalletScreen - Экран кошелька Лакшми
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
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
    Sparkles as PointsIcon,
    TrendingUp,
    MoreHorizontal,
    Info,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { useTranslation } from 'react-i18next';
import {
    WalletTransaction,
    getTransactions,
    getWalletStats,
    WalletStatsResponse,
    TRANSACTION_TYPE_LABELS,
    TRANSACTION_TYPE_COLORS,
    formatTransactionAmount,
    formatTransactionDate,
    getTransactionSign,
    getTransactionAmountParts,
    isBonusTransaction,
} from '../../services/walletService';
import ReceiptModal from '../../components/wallet/ReceiptModal';
import { WalletInfoModal } from '../../components/wallet/WalletInfoModal';
import { FrozenBalanceModal } from '../../components/wallet/FrozenBalanceModal';

type WalletTab = 'regular' | 'bonus';
type HistoryFilter = 'all' | 'bonus';

export default function WalletScreen() {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { wallet, refreshWallet, totalBalance, regularBalance, bonusBalance } = useWallet();

    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [stats, setStats] = useState<WalletStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<WalletTransaction | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showFrozen, setShowFrozen] = useState(false);
    const [walletTab, setWalletTab] = useState<WalletTab>('regular');
    const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const refreshInProgressRef = useRef(false);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
        };
    }, []);

    const loadData = useCallback(async (options?: { refresh?: boolean }) => {
        const requestId = latestLoadRequestRef.current + 1;
        latestLoadRequestRef.current = requestId;
        const isRefresh = options?.refresh === true;

        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const [txResponse, statsResponse] = await Promise.all([
                getTransactions({ limit: 50 }),
                getWalletStats(),
            ]);

            if (!isMountedRef.current || requestId !== latestLoadRequestRef.current) {
                return;
            }

            setTransactions(txResponse.transactions);
            setStats(statsResponse);
        } catch (error) {
            if (!isMountedRef.current || requestId !== latestLoadRequestRef.current) {
                return;
            }
            console.error('Failed to load wallet data:', error);
        } finally {
            if (!isMountedRef.current || requestId !== latestLoadRequestRef.current) {
                return;
            }
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        if (refreshInProgressRef.current) {
            return;
        }

        refreshInProgressRef.current = true;
        try {
            await Promise.all([refreshWallet(), loadData({ refresh: true })]);
        } catch (error) {
            if (isMountedRef.current) {
                console.error('Failed to refresh wallet screen:', error);
                setRefreshing(false);
            }
        } finally {
            refreshInProgressRef.current = false;
        }
    }, [refreshWallet, loadData]);

    const filteredTransactions = historyFilter === 'bonus'
        ? transactions.filter((tx) => isBonusTransaction(tx))
        : transactions;

    const renderTransaction = (item: WalletTransaction) => {
        const sign = getTransactionSign(item.type);
        const color = TRANSACTION_TYPE_COLORS[item.type];
        const { regularPart, bonusPart } = getTransactionAmountParts(item.amount, item.bonusAmount);

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.transactionItem}
                activeOpacity={0.7}
                onPress={() => setSelectedReceipt(item)}
            >
                <View style={[styles.transactionIcon, { backgroundColor: `${color}15` }]}>
                    {sign === '+' ? (
                        <ArrowDown size={18} color={color} />
                    ) : sign === '⎔' ? (
                        <MoreHorizontal size={18} color={color} />
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
                    {bonusPart > 0 && (
                        <Text style={styles.transactionSplit}>
                            Обычные: {regularPart.toLocaleString('ru-RU')} | Бонусные: {bonusPart.toLocaleString('ru-RU')}
                        </Text>
                    )}
                </View>
                <View style={styles.transactionAmountContainer}>
                    <Text style={[styles.transactionAmount, { color }]}>
                        {formatTransactionAmount(item.type, item.amount)}
                    </Text>
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
                        <Text style={styles.headerTitle}>LKM</Text>
                        <Text style={styles.headerSubtitle}>{t('wallet.management')}</Text>
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
                            <View style={styles.accountTabs}>
                                <TouchableOpacity
                                    style={[
                                        styles.accountTabButton,
                                        walletTab === 'regular' && styles.accountTabButtonActive,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() => setWalletTab('regular')}
                                >
                                    <Text
                                        style={[
                                            styles.accountTabText,
                                            walletTab === 'regular' && styles.accountTabTextActive,
                                        ]}
                                    >
                                        {t('wallet.mainTab')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.accountTabButton,
                                        walletTab === 'bonus' && styles.accountTabButtonActive,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() => setWalletTab('bonus')}
                                >
                                    <Text
                                        style={[
                                            styles.accountTabText,
                                            walletTab === 'bonus' && styles.accountTabTextActive,
                                        ]}
                                    >
                                        {t('wallet.bonusTab')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

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
                                        <PointsIcon size={14} color="rgba(26,26,46,0.6)" />
                                        <Text style={styles.balanceLabel}>
                                            {walletTab === 'regular' ? t('wallet.regularAccount') : t('wallet.bonusAccount')}
                                        </Text>
                                    </View>
                                    <View style={styles.balanceTopActions}>
                                        <View style={styles.currencyBadge}>
                                            <Text style={styles.currencyBadgeText}>LKM</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.infoButton}
                                            onPress={() => setShowInfo(true)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Info size={16} color="rgba(26,26,46,0.6)" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Unified Balance View */}
                                <View style={styles.balanceValueContainer}>
                                    <View style={styles.mainBalanceRow}>
                                        <Text style={styles.balanceValue}>
                                            {(walletTab === 'regular' ? regularBalance : bonusBalance).toLocaleString('ru-RU')}
                                        </Text>
                                        <Text style={styles.balanceLkmSuffix}>LKM</Text>
                                    </View>

                                    {/* Component Breakdown - Show both components regardless of tab */}
                                    <View style={styles.breakdownBox}>
                                        <View style={styles.breakdownHeader}>
                                            <Text style={styles.breakdownHeaderTitle}>{t('wallet.composition')}</Text>
                                            <Text style={styles.breakdownHeaderTotal}>{t('wallet.total')}: {totalBalance.toLocaleString('ru-RU')}</Text>
                                        </View>

                                        <View style={styles.breakdownItems}>
                                            <View style={[styles.breakdownItem, walletTab === 'regular' && styles.breakdownItemActive]}>
                                                <View style={[styles.breakdownDot, { backgroundColor: '#1a1a2e' }]} />
                                                <Text style={styles.breakdownLabel}>{t('wallet.personal')}</Text>
                                                <Text style={styles.breakdownValue}>{regularBalance.toLocaleString('ru-RU')}</Text>
                                            </View>

                                            <View style={styles.breakdownDivider} />

                                            <View style={[styles.breakdownItem, walletTab === 'bonus' && styles.breakdownItemActive]}>
                                                <View style={[styles.breakdownDot, { backgroundColor: '#3B82F6' }]} />
                                                <Text style={styles.breakdownLabel}>{t('wallet.bonuses')}</Text>
                                                <Text style={styles.breakdownValue}>{bonusBalance.toLocaleString('ru-RU')}</Text>
                                            </View>
                                        </View>

                                        {/* Status Indicators */}
                                        <View style={styles.statusBreakdown}>
                                            {(wallet?.frozenBalance ?? 0) > 0 || (wallet?.frozenBonusBalance ?? 0) > 0 ? (
                                                <TouchableOpacity
                                                    style={styles.statusItem}
                                                    onPress={() => setShowFrozen(true)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.statusLabel}>🔒 {t('wallet.frozen')}: {((wallet?.frozenBalance ?? 0) + (wallet?.frozenBonusBalance ?? 0)).toLocaleString('ru-RU')}</Text>
                                                </TouchableOpacity>
                                            ) : null}

                                            {(wallet?.pendingBalance ?? 0) > 0 ? (
                                                <View style={styles.statusItem}>
                                                    <Text style={styles.statusLabel}>⏳ {t('wallet.pending')}: {(wallet?.pendingBalance ?? 0).toLocaleString('ru-RU')}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>

                                    {walletTab === 'bonus' && (
                                        <View style={styles.bonusInfoBox}>
                                            <Text style={styles.bonusInfoText}>
                                                {t('wallet.bonusWarning')}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.balanceFooter}>
                                    <View style={styles.balanceStatRow}>
                                        <View style={styles.miniIconCircle}>
                                            <ArrowDown size={10} color="#1a1a2e" />
                                        </View>
                                        <View>
                                            <Text style={styles.balanceStatLabel}>{t('wallet.received')}</Text>
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
                                            <Text style={styles.balanceStatLabel}>{t('wallet.spent')}</Text>
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
                                    <Text style={styles.sectionTitle}>{t('wallet.analytics')}</Text>
                                </View>
                                <Text style={styles.sectionPeriod}>{t('wallet.thisMonth')}</Text>
                            </View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statCard}>
                                    <View style={[styles.statIconCircle, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                                        <ArrowDownCircle size={20} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.statCardLabel}>{t('wallet.income')}</Text>
                                    <Text style={[styles.statCardValue, { color: '#4CAF50' }]}>
                                        +{stats?.thisMonthIn.toLocaleString('ru-RU') || 0}
                                    </Text>
                                </View>
                                <View style={styles.statCard}>
                                    <View style={[styles.statIconCircle, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                        <ArrowUpCircle size={20} color="#F44336" />
                                    </View>
                                    <Text style={styles.statCardLabel}>{t('wallet.expense')}</Text>
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
                                    <Text style={styles.historyTitle}>{t('wallet.history')}</Text>
                                </View>
                            </View>

                            <View style={styles.historyFilterRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.historyFilterButton,
                                        historyFilter === 'all' && styles.historyFilterButtonActive,
                                    ]}
                                    onPress={() => setHistoryFilter('all')}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={[
                                            styles.historyFilterText,
                                            historyFilter === 'all' && styles.historyFilterTextActive,
                                        ]}
                                    >
                                        {t('wallet.all')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.historyFilterButton,
                                        historyFilter === 'bonus' && styles.historyFilterButtonActive,
                                    ]}
                                    onPress={() => setHistoryFilter('bonus')}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={[
                                            styles.historyFilterText,
                                            historyFilter === 'bonus' && styles.historyFilterTextActive,
                                        ]}
                                    >
                                        {t('wallet.bonusOnly')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {filteredTransactions.length === 0 ? (
                                <View style={styles.emptyHistory}>
                                    <View style={styles.emptyIconCircle}>
                                        <HistoryIcon size={32} color="rgba(245, 158, 11, 0.2)" />
                                    </View>
                                    <Text style={styles.emptyText}>
                                        {historyFilter === 'bonus'
                                            ? t('wallet.emptyBonusHistory')
                                            : t('wallet.emptyHistory')}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.historyList}>
                                    {filteredTransactions.map((tx) => renderTransaction(tx))}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                )}

                {selectedReceipt && (
                    <ReceiptModal
                        visible={!!selectedReceipt}
                        transaction={selectedReceipt}
                        onClose={() => setSelectedReceipt(null)}
                    />
                )}

                <WalletInfoModal
                    visible={showInfo}
                    onClose={() => setShowInfo(false)}
                />

                <FrozenBalanceModal
                    visible={showFrozen}
                    regularAmount={wallet?.frozenBalance ?? 0}
                    bonusAmount={wallet?.frozenBonusBalance ?? 0}
                    onClose={() => setShowFrozen(false)}
                />
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
    accountTabs: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    accountTabButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 10,
        alignItems: 'center',
    },
    accountTabButtonActive: {
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    accountTabText: {
        color: 'rgba(255,255,255,0.65)',
        fontWeight: '700',
        fontSize: 13,
    },
    accountTabTextActive: {
        color: '#FDE68A',
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
    balanceTopActions: {
        flexDirection: 'row',
        gap: 8,
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
        marginBottom: 20,
    },
    mainBalanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    balanceValue: {
        color: '#1a1a2e',
        fontSize: 52,
        fontWeight: '900',
        letterSpacing: -1.5,
    },
    balanceLkmSuffix: {
        color: 'rgba(26, 26, 46, 0.45)',
        fontSize: 20,
        fontWeight: '800',
    },
    breakdownBox: {
        marginTop: 16,
        backgroundColor: 'rgba(26, 26, 46, 0.08)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(26, 26, 46, 0.05)',
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    breakdownHeaderTitle: {
        color: 'rgba(26, 26, 46, 0.5)',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    breakdownHeaderTotal: {
        color: '#1a1a2e',
        fontSize: 11,
        fontWeight: '700',
    },
    breakdownItems: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 26, 46, 0.05)',
        borderRadius: 14,
        padding: 4,
    },
    breakdownItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        gap: 8,
    },
    breakdownItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    breakdownDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    breakdownLabel: {
        flex: 1,
        color: 'rgba(26, 26, 46, 0.6)',
        fontSize: 12,
        fontWeight: '600',
    },
    breakdownValue: {
        color: '#1a1a2e',
        fontSize: 13,
        fontWeight: '800',
    },
    breakdownDivider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(26, 26, 46, 0.1)',
    },
    statusBreakdown: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 4,
    },
    statusItem: {
        backgroundColor: 'rgba(26, 26, 46, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusLabel: {
        color: 'rgba(26, 26, 46, 0.7)',
        fontSize: 11,
        fontWeight: '700',
    },
    bonusInfoBox: {
        marginTop: 12,
        paddingHorizontal: 8,
    },
    bonusInfoText: {
        color: 'rgba(26, 26, 46, 0.65)',
        fontSize: 11,
        fontWeight: '500',
        fontStyle: 'italic',
        lineHeight: 15,
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
    historyFilterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    historyFilterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    historyFilterButtonActive: {
        borderColor: 'rgba(245, 158, 11, 0.45)',
        backgroundColor: 'rgba(245, 158, 11, 0.18)',
    },
    historyFilterText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '700',
    },
    historyFilterTextActive: {
        color: '#FDE68A',
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
    transactionSplit: {
        color: 'rgba(255, 255, 255, 0.55)',
        fontSize: 11,
        marginTop: 6,
        fontWeight: '600',
    },
    transactionAmountContainer: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: '800',
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
    infoButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});
