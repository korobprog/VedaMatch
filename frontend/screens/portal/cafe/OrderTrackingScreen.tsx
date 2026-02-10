import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import {
    CafeOrder,
    CafeOrderStatus,
    getOrderStatusColor,
} from '../../../types/cafe';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

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
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const { orderId } = route.params;
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [order, setOrder] = useState<CafeOrder | null>(null);
    const [loading, setLoading] = useState(true);

    const progressAnim = useRef(new Animated.Value(0)).current;

    const loadOrder = useCallback(async (silent = false) => {
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
        }
    }, [orderId, t]);

    useEffect(() => {
        loadOrder();
        const interval = setInterval(() => {
            loadOrder(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [loadOrder]);

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
    }, [order, progressAnim]);

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
                        } catch {
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
        } catch {
            Alert.alert(t('common.error'), t('cafe.dashboard.loadError'));
        }
    };

    if (loading) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>{t('cafe.tracking.loading')}</Text>
            </LinearGradient>
        );
    }

    if (!order) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <XCircle size={48} color={colors.textSecondary} />
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
            <LinearGradient colors={roleTheme.gradient} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.tracking.orderNum', { number: order.orderNumber })}</Text>
                <TouchableOpacity style={styles.headerBtn} onPress={() => loadOrder(true)}>
                    <RefreshCw size={20} color={colors.textPrimary} />
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
                                <Clock size={12} color={colors.textSecondary} />
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
                                                <Check size={10} color={colors.textPrimary} strokeWidth={3} />
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
                            <Utensils size={18} color={colors.accent} />
                            <Text style={styles.infoText}>{order.cafeInfo?.name}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Tag size={18} color={colors.textSecondary} />
                            <Text style={styles.infoTextSub}>
                                {t(`cafe.form.${order.orderType === 'dine_in' ? 'dineIn' : order.orderType}`)}
                            </Text>
                        </View>
                        {order.tableInfo && (
                            <View style={styles.infoItem}>
                                <MapPin size={18} color={colors.textSecondary} />
                                <Text style={styles.infoTextSub}>
                                    {t('cafe.detail.tableInfo', { tableNumber: order.tableInfo.number })}
                                </Text>
                            </View>
                        )}
                        <View style={styles.infoItem}>
                            <Clock size={18} color={colors.textSecondary} />
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
                                    <Utensils size={18} color={colors.textSecondary} />
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
                            <Hand size={20} color={colors.accent} />
                            <Text style={styles.actionBtnText}>{t('cafe.tracking.callWaiter')}</Text>
                            <ChevronRight size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}

                    {canCancel && (
                        <TouchableOpacity
                            style={[styles.actionBtnGlass, styles.cancelBtn]}
                            onPress={handleCancelOrder}
                        >
                            <XCircle size={20} color={colors.danger} />
                            <Text style={styles.cancelBtnText}>
                                {t('cafe.tracking.cancelOrder')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {(isCompleted || isCancelled) && (
                        <TouchableOpacity style={styles.repeatBtn} onPress={handleRepeatOrder}>
                            <LinearGradient
                                colors={[colors.accent, colors.warning]}
                                style={styles.repeatGradient}
                            >
                                <RotateCcw size={20} color={colors.textPrimary} />
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

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.textSecondary,
        marginTop: 16,
        fontWeight: '600',
    },
    errorText: {
        color: colors.textSecondary,
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
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        color: colors.textPrimary,
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
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
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
        shadowColor: colors.overlay,
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
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    estimatedTime: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    progressBox: {
        marginTop: 10,
    },
    progressBar: {
        height: 6,
        backgroundColor: colors.surface,
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
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    stepCircleCurrent: {
        borderColor: colors.border,
        shadowColor: colors.textPrimary,
        shadowRadius: 10,
        shadowOpacity: 0.2,
    },
    stepLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        textAlign: 'center',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    stepLabelActive: {
        color: colors.textPrimary,
    },
    glassSection: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    sectionHeadline: {
        color: colors.textSecondary,
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
        color: colors.textPrimary,
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    infoTextSub: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemMain: {
        flex: 1,
    },
    itemName: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    itemQty: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    itemPrice: {
        color: colors.accent,
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
        borderTopColor: colors.border,
    },
    totalLabel: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    totalValue: {
        color: colors.accent,
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
        backgroundColor: colors.surface,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionBtnText: {
        color: colors.accent,
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    cancelBtn: {
        borderColor: colors.danger,
    },
    cancelBtnText: {
        color: colors.danger,
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
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});

export default OrderTrackingScreen;
