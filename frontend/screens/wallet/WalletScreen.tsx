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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowDown, ArrowUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react-native';
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
            <View key={item.id} style={styles.transactionItem}>
                <View style={[styles.transactionIcon, { backgroundColor: `${color}20` }]}>
                    {sign === '+' ? (
                        <ArrowDown size={20} color={color} />
                    ) : (
                        <ArrowUp size={20} color={color} />
                    )}
                </View>
                <View style={styles.transactionContent}>
                    <Text style={styles.transactionType}>
                        {TRANSACTION_TYPE_LABELS[item.type]}
                    </Text>
                    <Text style={styles.transactionDesc} numberOfLines={1}>
                        {item.description || 'Операция'}
                    </Text>
                    <Text style={styles.transactionDate}>
                        {formatTransactionDate(item.createdAt)}
                    </Text>
                </View>
                <Text style={[styles.transactionAmount, { color }]}>
                    {formatTransactionAmount(item.type, item.amount)}
                </Text>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Кошелёк</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#FFD700" />
                    </View>
                ) : (
                    <ScrollView
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#FFD700"
                            />
                        }
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Balance Card */}
                        <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.balanceCard}
                        >
                            <Text style={styles.balanceLabel}>{CURRENCY_NAME}</Text>
                            <View style={styles.balanceRow}>
                                <Text style={styles.balanceValue}>
                                    {wallet?.balance.toLocaleString('ru-RU') || 0}
                                </Text>
                                <Text style={styles.balanceCurrency}>{CURRENCY_CODE}</Text>
                            </View>
                            <View style={styles.balanceStats}>
                                <View style={styles.balanceStat}>
                                    <ArrowDownCircle size={16} color="rgba(0,0,0,0.6)" />
                                    <Text style={styles.balanceStatValue}>
                                        +{stats?.totalEarned.toLocaleString('ru-RU') || 0}
                                    </Text>
                                    <Text style={styles.balanceStatLabel}>заработано</Text>
                                </View>
                                <View style={styles.balanceStatDivider} />
                                <View style={styles.balanceStat}>
                                    <ArrowUpCircle size={16} color="rgba(0,0,0,0.6)" />
                                    <Text style={styles.balanceStatValue}>
                                        -{stats?.totalSpent.toLocaleString('ru-RU') || 0}
                                    </Text>
                                    <Text style={styles.balanceStatLabel}>потрачено</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Info Card */}
                        <View style={styles.infoCard}>
                            <Text style={styles.infoIcon}>💡</Text>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoTitle}>Что такое Лакшми?</Text>
                                <Text style={styles.infoText}>
                                    Лакшми — это игровая валюта платформы. Зарабатывайте её,
                                    оказывая услуги, и тратьте на бронирование сервисов.
                                </Text>
                            </View>
                        </View>

                        {/* This Month Stats */}
                        {stats && (
                            <View style={styles.monthStats}>
                                <Text style={styles.sectionTitle}>За этот месяц</Text>
                                <View style={styles.monthStatsRow}>
                                    <View style={styles.monthStat}>
                                        <Text style={styles.monthStatValue}>
                                            +{stats.thisMonthIn.toLocaleString('ru-RU')}
                                        </Text>
                                        <Text style={styles.monthStatLabel}>Получено</Text>
                                    </View>
                                    <View style={styles.monthStat}>
                                        <Text style={[styles.monthStatValue, { color: '#F44336' }]}>
                                            -{stats.thisMonthOut.toLocaleString('ru-RU')}
                                        </Text>
                                        <Text style={styles.monthStatLabel}>Потрачено</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Transactions */}
                        <View style={styles.transactionsSection}>
                            <Text style={styles.sectionTitle}>История операций</Text>

                            {transactions.length === 0 ? (
                                <View style={styles.emptyTransactions}>
                                    <Text style={styles.emptyIcon}>📭</Text>
                                    <Text style={styles.emptyText}>Операций пока нет</Text>
                                </View>
                            ) : (
                                <View style={styles.transactionsList}>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
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
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceCard: {
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 20,
        padding: 24,
    },
    balanceLabel: {
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20,
    },
    balanceValue: {
        color: '#1a1a2e',
        fontSize: 48,
        fontWeight: '800',
    },
    balanceCurrency: {
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: 20,
        fontWeight: '600',
        marginLeft: 8,
    },
    balanceStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 12,
        padding: 12,
    },
    balanceStat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    balanceStatValue: {
        color: '#1a1a2e',
        fontSize: 14,
        fontWeight: '700',
    },
    balanceStatLabel: {
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: 11,
    },
    balanceStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    infoCard: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    infoIcon: {
        fontSize: 24,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        lineHeight: 18,
    },
    monthStats: {
        marginHorizontal: 16,
        marginTop: 24,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    monthStatsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    monthStat: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
    },
    monthStatValue: {
        color: '#4CAF50',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    monthStatLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
    transactionsSection: {
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 100,
    },
    transactionsList: {
        gap: 2,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 12,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionContent: {
        flex: 1,
    },
    transactionType: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    transactionDesc: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    transactionDate: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptyTransactions: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
    },
});
