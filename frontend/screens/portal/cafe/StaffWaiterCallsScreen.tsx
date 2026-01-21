import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Vibration,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, UtensilsCrossed, AlertCircle, FileText, CreditCard, Hand, MessageCircle, Check, CheckCheck } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { WaiterCall, WaiterCallStatus, getWaiterCallReasonLabel } from '../../../types/cafe';

type RouteParams = {
    StaffWaiterCalls: {
        cafeId: number;
        cafeName: string;
    };
};

const StaffWaiterCallsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'StaffWaiterCalls'>>();
    const { t } = useTranslation();
    const { cafeId, cafeName } = route.params;

    const [calls, setCalls] = useState<WaiterCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const pollInterval = useRef<NodeJS.Timeout | null>(null);
    const previousCallsCount = useRef(0);

    useEffect(() => {
        loadCalls();

        // Poll for updates every 3 seconds
        pollInterval.current = setInterval(() => {
            loadCalls(true);
        }, 3000);

        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, [cafeId]);

    const loadCalls = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const data = await cafeService.getWaiterCalls(cafeId);

            // Check if there are new calls
            const pendingCalls = data.filter((c: WaiterCall) => c.status === 'pending');
            if (pendingCalls.length > previousCallsCount.current) {
                // New call received - vibrate
                Vibration.vibrate([100, 100, 100]);
            }
            previousCallsCount.current = pendingCalls.length;

            setCalls(data);
        } catch (error) {
            console.error('Error loading waiter calls:', error);
            if (!silent) {
                Alert.alert(t('common.error'), t('cafe.staff.waiterCalls.loadError'));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadCalls();
    };

    const handleAcknowledge = async (call: WaiterCall) => {
        try {
            await cafeService.acknowledgeWaiterCall(cafeId, call.id);
            loadCalls(true);
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.staff.waiterCalls.ackError'));
        }
    };

    const handleComplete = async (call: WaiterCall) => {
        try {
            await cafeService.completeWaiterCall(cafeId, call.id);
            loadCalls(true);
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.staff.waiterCalls.completeError'));
        }
    };

    const getStatusColor = (status: WaiterCallStatus): string => {
        switch (status) {
            case 'pending': return '#FF9500';
            case 'acknowledged': return '#007AFF';
            case 'completed': return '#8E8E93';
            default: return '#8E8E93';
        }
    };

    const getStatusLabel = (status: WaiterCallStatus): string => {
        return t(`cafe.staff.waiterCalls.status.${status}`);
    };

    const getTimeSince = (date: string): string => {
        const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
        if (minutes < 1) return t('cafe.staff.waiterCalls.time.now');
        if (minutes < 60) return t('cafe.staff.waiterCalls.time.minutes', { count: minutes });
        const hours = Math.floor(minutes / 60);
        return t('cafe.staff.waiterCalls.time.hours', { count: hours });
    };

    const renderReasonIcon = (reason: string) => {
        if (reason === 'order') return <FileText size={16} color="#FFFFFF" />;
        if (reason === 'payment') return <CreditCard size={16} color="#FFFFFF" />;
        if (reason === 'service') return <Hand size={16} color="#FFFFFF" />;
        return <MessageCircle size={16} color="#FFFFFF" />;
    };

    const renderCallItem = ({ item: call }: { item: WaiterCall }) => {
        const isPending = call.status === 'pending';
        const isAcknowledged = call.status === 'acknowledged';

        return (
            <View style={[
                styles.callCard,
                isPending && styles.callCardUrgent,
            ]}>
                <View style={styles.callHeader}>
                    <View style={styles.tableInfo}>
                        <UtensilsCrossed size={20} color="#FF6B00" />
                        <Text style={styles.tableName}>
                            {t('cafe.detail.tableInfo', { tableNumber: call.table?.number || call.tableId })}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(call.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(call.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(call.status) }]}>
                            {getStatusLabel(call.status)}
                        </Text>
                    </View>
                </View>

                <View style={styles.callBody}>
                    <View style={styles.reasonContainer}>
                        {renderReasonIcon(call.reason)}
                        <Text style={styles.reasonText}>
                            {t(`cafe.trackingByReason.${call.reason}`)}
                        </Text>
                    </View>
                    {call.note && (
                        <Text style={styles.noteText}>💬 {call.note}</Text>
                    )}
                    <Text style={styles.timeText}>{getTimeSince(call.createdAt)}</Text>
                </View>

                <View style={styles.callActions}>
                    {isPending && (
                        <TouchableOpacity
                            style={styles.acknowledgeButton}
                            onPress={() => handleAcknowledge(call)}
                        >
                            <Check size={18} color="#FFFFFF" />
                            <Text style={styles.buttonText}>{t('cafe.staff.waiterCalls.accept')}</Text>
                        </TouchableOpacity>
                    )}
                    {isAcknowledged && (
                        <TouchableOpacity
                            style={styles.completeButton}
                            onPress={() => handleComplete(call)}
                        >
                            <CheckCheck size={18} color="#FFFFFF" />
                            <Text style={styles.buttonText}>{t('cafe.staff.waiterCalls.served')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // Separate pending and others
    const pendingCalls = calls.filter(c => c.status === 'pending');
    const acknowledgedCalls = calls.filter(c => c.status === 'acknowledged');
    const completedCalls = calls.filter(c => c.status === 'completed');

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.staff.waiterCalls.title')}</Text>
                <TouchableOpacity onPress={() => loadCalls()}>
                    <RefreshCw size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Pending count banner */}
            {pendingCalls.length > 0 && (
                <View style={styles.alertBanner}>
                    <AlertCircle size={20} color="#FF9500" />
                    <Text style={styles.alertText}>
                        {t(`cafe.staff.waiterCalls.alert_${pendingCalls.length === 1 ? 'one' : 'many'}`, { count: pendingCalls.length })}
                    </Text>
                </View>
            )}

            <FlatList
                data={[...pendingCalls, ...acknowledgedCalls, ...completedCalls.slice(0, 5)]}
                renderItem={renderCallItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Hand size={64} color="#8E8E93" />
                        <Text style={styles.emptyTitle}>{t('cafe.staff.waiterCalls.noCalls')}</Text>
                        <Text style={styles.emptyText}>
                            {t('cafe.staff.waiterCalls.noCallsDesc')}
                        </Text>
                    </View>
                }
            />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 48,
        backgroundColor: '#1C1C1E',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 149, 0, 0.15)',
        padding: 12,
    },
    alertText: {
        color: '#FF9500',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    callCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    callCardUrgent: {
        borderWidth: 2,
        borderColor: '#FF9500',
    },
    callHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tableInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tableName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    callBody: {
        marginBottom: 12,
    },
    reasonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    reasonText: {
        color: '#FFFFFF',
        fontSize: 15,
    },
    noteText: {
        color: '#8E8E93',
        fontSize: 14,
        marginBottom: 8,
    },
    timeText: {
        color: '#8E8E93',
        fontSize: 12,
    },
    callActions: {
        flexDirection: 'row',
        gap: 12,
    },
    acknowledgeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 10,
    },
    completeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#34C759',
        padding: 12,
        borderRadius: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 48,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
});

export default StaffWaiterCallsScreen;
