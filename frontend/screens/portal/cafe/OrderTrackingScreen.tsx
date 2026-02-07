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
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    RefreshCw,
    Check,
    Utensils,
    Tag,
    MapPin,
    Clock,
    Hand,
    XCircle,
    RotateCcw,
    ChevronRight,
    Map
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import {
    CafeOrder,
    CafeOrderStatus,
    getOrderStatusColor,
} from '../../../types/cafe';

const { width } = Dimensions.get('window');

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

    const callWaiter = async (reason: any) => {
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
            <LinearGradient colors={['#0a0a14', '#12122b']} style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.loadingText}>{t('cafe.tracking.loading')}</Text>
            </LinearGradient>
        );
    }

    if (!order) {
        return (
            <LinearGradient colors={['#0a0a14', '#12122b']} style={styles.centerContainer}>
                <XCircle size={48} color="rgba(255,255,255,0.1)" />
                <Text style={styles.errorText}>{t('cafe.tracking.notFound')}</Text>
            </LinearGradient>
        );
    }

    const currentStepIndex = ORDER_STEPS.indexOf(order.status);
    const isCancelled = order.status === 'cancelled';
    const isCompleted = order.status === 'completed';
    const canCancel = ['new', 'confirmed'].includes(order.status);
    const statusColor = getOrderStatusColor(order.status);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0a0a14', '#12122b']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.tracking.orderNum', { number: order.orderNumber })}</Text>
                <TouchableOpacity style={styles.headerBtn} onPress={() => loadOrder(true)}>
                    <RefreshCw size={20} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Status Card */}
                <View style={styles.statusGlass}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {t(`cafe.tracking.status.${order.status}`)}
                        </Text>
                        {order.estimatedReadyAt && !isCompleted && !isCancelled && (
                            <View style={styles.timeTag}>
                                <Clock size={12} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.estimatedTime}>
                                    {new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}
                    </View>

                    {!isCancelled && (
                        <View style={styles.progressBox}>
                            <View style={styles.progressBar}>
                                <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: statusColor }]} />
                            </View>
                            <View style={styles.stepsFlow}>
                                {ORDER_STEPS.map((step, index) => (
                                    <View key={step} style={styles.stepPoint}>
                                        <View style={[
                                            styles.stepCircle,
                                            index <= currentStepIndex && { backgroundColor: statusColor, borderColor: statusColor },
                                            index === currentStepIndex && styles.stepCircleCurrent,
                                        ]}>
                                            {index < currentStepIndex && (
                                                <Check size={10} color="#1a1a2e" strokeWidth={3} />
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
                </View>

                {/* Info Section */}
                <View style={styles.glassSection}>
                    <Text style={styles.sectionHeadline}>{t('cafe.tracking.info')}</Text>
                    <View style={styles.infoList}>
                        <View style={styles.infoItem}>
                            <Utensils size={18} color="#F59E0B" />
                            <Text style={styles.infoText}>{order.cafeInfo?.name}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Tag size={18} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.infoTextSub}>
                                {t(`cafe.form.${order.orderType === 'dine_in' ? 'dineIn' : order.orderType}`)}
                            </Text>
                        </View>
                        {order.tableInfo && (
                            <View style={styles.infoItem}>
                                <MapPin size={18} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.infoTextSub}>
                                    {t('cafe.detail.tableInfo', { tableNumber: order.tableInfo.number })}
                                </Text>
                            </View>
                        )}
                        <View style={styles.infoItem}>
                            <Clock size={18} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.infoTextSub}>
                                {new Date(order.createdAt).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.glassSection}>
                    <Text style={styles.sectionHeadline}>{t('cafe.tracking.items')}</Text>
                    {order.items?.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            {item.imageUrl ? (
                                <Image source={{ uri: item.imageUrl }} style={styles.itemImg} />
                            ) : (
                                <View style={styles.itemImgPlaceholder}>
                                    <Utensils size={18} color="rgba(255,255,255,0.1)" />
                                </View>
                            )}
                            <View style={styles.itemMain}>
                                <Text style={styles.itemName} numberOfLines={1}>{item.dishName}</Text>
                                <Text style={styles.itemQty}>x{item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>{item.total} ₽</Text>
                        </View>
                    ))}

                    <View style={styles.totalEntry}>
                        <Text style={styles.totalLabel}>{t('cafe.cart.total')}</Text>
                        <Text style={styles.totalValue}>{order.total} ₽</Text>
                    </View>
                </View>

                {/* Actions Box */}
                <View style={styles.actionBox}>
                    {order.tableId && !isCompleted && !isCancelled && (
                        <TouchableOpacity style={styles.actionBtnGlass} onPress={handleCallWaiter}>
                            <Hand size={20} color="#F59E0B" />
                            <Text style={styles.actionBtnText}>{t('cafe.tracking.callWaiter')}</Text>
                            <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                        </TouchableOpacity>
                    )}

                    {canCancel && (
                        <TouchableOpacity
                            style={[styles.actionBtnGlass, styles.cancelBtn]}
                            onPress={handleCancelOrder}
                        >
                            <XCircle size={20} color="#EF4444" />
                            <Text style={styles.cancelBtnText}>
                                {t('cafe.tracking.cancelOrder')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {(isCompleted || isCancelled) && (
                        <TouchableOpacity style={styles.repeatBtn} onPress={handleRepeatOrder}>
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                style={styles.repeatGradient}
                            >
                                <RotateCcw size={20} color="#1a1a2e" />
                                <Text style={styles.repeatBtnText}>{t('cafe.tracking.repeatOrder')}</Text>
                            </LinearGradient>
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
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.4)',
        marginTop: 16,
        fontWeight: '600',
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
    statusGlass: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 20,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
        shadowColor: '#000',
        shadowRadius: 4,
        shadowOpacity: 0.3,
    },
    statusText: {
        fontSize: 20,
        fontFamily: 'Cinzel-Bold',
        flex: 1,
    },
    timeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    estimatedTime: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '700',
    },
    progressBox: {
        marginTop: 10,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        marginBottom: 16,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    stepsFlow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepPoint: {
        alignItems: 'center',
        flex: 1,
    },
    stepCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    stepCircleCurrent: {
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#fff',
        shadowRadius: 10,
        shadowOpacity: 0.2,
    },
    stepLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    stepLabelActive: {
        color: 'rgba(255,255,255,0.8)',
    },
    glassSection: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 20,
    },
    sectionHeadline: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
    },
    infoList: {
        gap: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    infoTextSub: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '600',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    itemImg: {
        width: 44,
        height: 44,
        borderRadius: 10,
        marginRight: 12,
    },
    itemImgPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemMain: {
        flex: 1,
    },
    itemName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    itemQty: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    itemPrice: {
        color: '#F59E0B',
        fontSize: 15,
        fontWeight: '800',
    },
    totalEntry: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    totalLabel: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    totalValue: {
        color: '#F59E0B',
        fontSize: 22,
        fontWeight: '900',
    },
    actionBox: {
        gap: 12,
    },
    actionBtnGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    actionBtnText: {
        color: '#F59E0B',
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    cancelBtn: {
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    cancelBtnText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    repeatBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
    },
    repeatGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 12,
    },
    repeatBtnText: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});

export default OrderTrackingScreen;
