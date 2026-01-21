import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Check, Utensils, Tag, MapPin, Clock, Hand, XCircle, RotateCcw } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import {
    CafeOrder,
    CafeOrderStatus,
    getOrderStatusLabel,
    getOrderStatusColor,
    getOrderTypeLabel,
    WaiterCallReason,
} from '../../../types/cafe';

type RouteParams = {
    OrderTracking: {
        orderId: number;
    };
};

const ORDER_STEPS: CafeOrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'completed'];

const OrderTrackingScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'OrderTracking'>>();
    const { t } = useTranslation();
    const { orderId } = route.params;

    const [order, setOrder] = useState<CafeOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadOrder();

        // Poll for updates every 10 seconds
        const interval = setInterval(() => {
            loadOrder(true);
        }, 10000);

        return () => clearInterval(interval);
    }, [orderId]);

    useEffect(() => {
        if (order) {
            const currentStepIndex = ORDER_STEPS.indexOf(order.status);
            const progress = currentStepIndex / (ORDER_STEPS.length - 1);

            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 500,
                useNativeDriver: false,
            }).start();
        }
    }, [order?.status]);

    const loadOrder = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const orderData = await cafeService.getOrder(orderId);
            setOrder(orderData);
        } catch (error) {
            console.error('Error loading order:', error);
            if (!silent) {
                Alert.alert(t('common.error'), t('cafe.dashboard.loadError'));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCallWaiter = () => {
        Alert.alert(
            t('cafe.tracking.callWaiter'),
            t('cafe.tracking.chooseReason'),
            [
                { text: t('cafe.tracking.reasonOrder'), onPress: () => callWaiter('order') },
                { text: t('cafe.tracking.reasonPayment'), onPress: () => callWaiter('payment') },
                { text: t('cafe.tracking.reasonService'), onPress: () => callWaiter('service') },
                { text: t('common.cancel'), style: 'cancel' },
            ]
        );
    };

    const callWaiter = async (reason: WaiterCallReason) => {
        if (!order || !order.tableId) return;

        try {
            await cafeService.callWaiter(order.cafeId, order.tableId, reason);
            Alert.alert(t('common.success'), t('cafe.tracking.waiterComing'));
        } catch (error) {
            console.error('Error calling waiter:', error);
            Alert.alert(t('common.error'), t('cafe.dashboard.loadError'));
        }
    };

    const handleCancelOrder = () => {
        Alert.alert(
            t('cafe.tracking.cancelConfirmTitle'),
            t('cafe.tracking.cancelConfirmDesc'),
            [
                { text: t('cafe.tracking.cancelNo'), style: 'cancel' },
                {
                    text: t('cafe.tracking.cancelYes'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cafeService.cancelOrder(orderId, t('cafe.tracking.status.cancelled'));
                            loadOrder();
                        } catch (error) {
                            Alert.alert(t('common.error'), t('cafe.dashboard.loadError'));
                        }
                    },
                },
            ]
        );
    };

    const handleRepeatOrder = async () => {
        try {
            const newOrder = await cafeService.repeatOrder(orderId);
            navigation.replace('OrderSuccess', {
                orderId: newOrder.id,
                orderNumber: newOrder.orderNumber,
            });
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.dashboard.loadError'));
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>{t('cafe.tracking.loading')}</Text>
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('cafe.tracking.notFound')}</Text>
            </View>
        );
    }

    const currentStepIndex = ORDER_STEPS.indexOf(order.status);
    const isCancelled = order.status === 'cancelled';
    const isCompleted = order.status === 'completed';
    const canCancel = ['new', 'confirmed'].includes(order.status);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.tracking.orderNum', { number: order.orderNumber })}</Text>
                <TouchableOpacity onPress={() => loadOrder()}>
                    <RefreshCw size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Status banner */}
                <View style={[styles.statusBanner, { backgroundColor: getOrderStatusColor(order.status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getOrderStatusColor(order.status) }]} />
                    <Text style={[styles.statusText, { color: getOrderStatusColor(order.status) }]}>
                        {t(`cafe.tracking.status.${order.status}`)}
                    </Text>
                    {order.estimatedReadyAt && !isCompleted && !isCancelled && (
                        <Text style={styles.estimatedTime}>
                            {t('cafe.tracking.estimated')} {new Date(order.estimatedReadyAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    )}
                </View>

                {/* Progress tracker */}
                {!isCancelled && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                        </View>
                        <View style={styles.stepsContainer}>
                            {ORDER_STEPS.map((step, index) => (
                                <View key={step} style={styles.stepItem}>
                                    <View style={[
                                        styles.stepDot,
                                        index <= currentStepIndex && styles.stepDotActive,
                                        index === currentStepIndex && styles.stepDotCurrent,
                                    ]}>
                                        {index < currentStepIndex && (
                                            <Check size={12} color="#FFFFFF" />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.stepLabel,
                                        index <= currentStepIndex && styles.stepLabelActive,
                                    ]}>
                                        {t(`cafe.tracking.status.${step}`)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Order info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.tracking.info')}</Text>

                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Utensils size={20} color="#FF6B00" />
                            <Text style={styles.infoLabel}>{order.cafeInfo?.name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Tag size={20} color="#8E8E93" />
                            <Text style={styles.infoValue}>{t(`cafe.form.${order.orderType === 'dine_in' ? 'dineIn' : order.orderType}`)}</Text>
                        </View>
                        {order.tableInfo && (
                            <View style={styles.infoRow}>
                                <MapPin size={20} color="#8E8E93" />
                                <Text style={styles.infoValue}>{t('cafe.detail.tableInfo', { tableNumber: order.tableInfo.number })}</Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <Clock size={20} color="#8E8E93" />
                            <Text style={styles.infoValue}>
                                {new Date(order.createdAt).toLocaleString('ru-RU')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Order items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.tracking.items')}</Text>

                    {order.items?.map((item, index) => (
                        <View key={index} style={styles.orderItem}>
                            {item.imageUrl && (
                                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                            )}
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName}>{item.dishName}</Text>
                                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>{item.total} ₽</Text>
                        </View>
                    ))}

                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>{t('cafe.cart.total')}</Text>
                        <Text style={styles.totalValue}>{order.total} ₽</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {order.tableId && !isCompleted && !isCancelled && (
                        <TouchableOpacity style={styles.actionButton} onPress={handleCallWaiter}>
                            <Hand size={20} color="#FF6B00" />
                            <Text style={styles.actionButtonText}>{t('cafe.tracking.callWaiter')}</Text>
                        </TouchableOpacity>
                    )}

                    {canCancel && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={handleCancelOrder}
                        >
                            <XCircle size={20} color="#FF3B30" />
                            <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
                                {t('cafe.tracking.cancelOrder')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {(isCompleted || isCancelled) && (
                        <TouchableOpacity style={styles.repeatButton} onPress={handleRepeatOrder}>
                            <RotateCcw size={20} color="#FFFFFF" />
                            <Text style={styles.repeatButtonText}>{t('cafe.tracking.repeatOrder')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

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
    loadingText: {
        color: '#FFFFFF',
        marginTop: 12,
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
    scrollView: {
        flex: 1,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        margin: 16,
        borderRadius: 12,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    estimatedTime: {
        color: '#8E8E93',
        fontSize: 13,
    },
    progressContainer: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#2C2C2E',
        borderRadius: 2,
        marginBottom: 16,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 2,
    },
    stepsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    stepDotActive: {
        backgroundColor: '#FF6B00',
    },
    stepDotCurrent: {
        borderWidth: 3,
        borderColor: 'rgba(255, 107, 0, 0.3)',
    },
    stepLabel: {
        fontSize: 10,
        color: '#8E8E93',
        textAlign: 'center',
    },
    stepLabelActive: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 12,
    },
    infoValue: {
        color: '#8E8E93',
        fontSize: 14,
        marginLeft: 12,
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    itemImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 12,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        color: '#FFFFFF',
        fontSize: 15,
    },
    itemQuantity: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 2,
    },
    itemPrice: {
        color: '#FF6B00',
        fontSize: 15,
        fontWeight: '600',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
    },
    totalLabel: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        color: '#FF6B00',
        fontSize: 20,
        fontWeight: 'bold',
    },
    actions: {
        padding: 16,
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1C1C1E',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF6B00',
    },
    actionButtonText: {
        color: '#FF6B00',
        fontSize: 15,
        fontWeight: '600',
    },
    cancelButton: {
        borderColor: '#FF3B30',
    },
    cancelButtonText: {
        color: '#FF3B30',
    },
    repeatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FF6B00',
        padding: 16,
        borderRadius: 12,
    },
    repeatButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default OrderTrackingScreen;
