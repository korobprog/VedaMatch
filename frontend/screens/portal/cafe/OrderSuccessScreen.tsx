import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    Dimensions,
    Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { Check, Clock, Bell, Eye, Utensils } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type RouteParams = {
    CafeOrderSuccess: {
        orderId: number;
        orderNumber: string;
    };
};

const OrderSuccessScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'CafeOrderSuccess'>>();
    const { t } = useTranslation();
    const { orderId, orderNumber } = route.params;

    const [scaleAnim] = useState(new Animated.Value(0));
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        // Animate check mark
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.2,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(2)),
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        // Fade in content
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            delay: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleTrackOrder = () => {
        navigation.replace('OrderTracking', { orderId });
    };

    const handleBackToMenu = () => {
        navigation.popToTop();
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0a0a14', '#12122b']} style={StyleSheet.absoluteFill} />

            <View style={styles.centerBox}>
                <Animated.View style={[styles.checkContainer, { transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.checkCircle}
                    >
                        <Check size={56} color="#1a1a2e" strokeWidth={4} />
                    </LinearGradient>
                    <View style={styles.glow} />
                </Animated.View>

                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    <Text style={styles.title}>{t('cafe.success.title')}</Text>
                    <View style={styles.orderBadge}>
                        <Text style={styles.orderLabel}>{t('cafe.cart.order')}</Text>
                        <Text style={styles.orderNumber}>#{orderNumber}</Text>
                    </View>

                    <View style={styles.glassInfo}>
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Clock size={20} color="#F59E0B" />
                            </View>
                            <View style={styles.textStack}>
                                <Text style={styles.infoTitle}>{t('cafe.success.wait')}</Text>
                                <Text style={styles.infoDesc}>{t('cafe.success.waitDesc')}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Bell size={20} color="#F59E0B" />
                            </View>
                            <View style={styles.textStack}>
                                <Text style={styles.infoTitle}>{t('cafe.success.notif')}</Text>
                                <Text style={styles.infoDesc}>{t('cafe.success.notifDesc')}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.tipsGlass}>
                        <View style={styles.tipsHeader}>
                            <Utensils size={14} color="#F59E0B" />
                            <Text style={styles.tipsTitle}>{t('cafe.success.useful')}</Text>
                        </View>
                        <Text style={styles.tipsText}>
                            {t('cafe.success.usefulDesc')}
                        </Text>
                    </View>
                </Animated.View>
            </View>

            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleTrackOrder}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.btnGradient}
                    >
                        <Eye size={20} color="#1a1a2e" />
                        <Text style={styles.primaryBtnText}>{t('cafe.success.track')}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handleBackToMenu}
                >
                    <Text style={styles.secondaryBtnText}>{t('cafe.cart.backToMenu')}</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkContainer: {
        marginBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircle: {
        width: 130,
        height: 130,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '45deg' }],
        zIndex: 2,
    },
    glow: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        zIndex: 1,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontFamily: 'Cinzel-Bold',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    orderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    orderLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    orderNumber: {
        fontSize: 16,
        color: '#F59E0B',
        fontWeight: '900',
    },
    glassInfo: {
        width: '100%',
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textStack: {
        flex: 1,
    },
    infoTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    infoDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 20,
    },
    tipsGlass: {
        width: '100%',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.15)',
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    tipsTitle: {
        color: '#F59E0B',
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tipsText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '500',
    },
    footer: {
        width: '100%',
        gap: 16,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    primaryBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    btnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    primaryBtnText: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    secondaryBtn: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});

export default OrderSuccessScreen;
