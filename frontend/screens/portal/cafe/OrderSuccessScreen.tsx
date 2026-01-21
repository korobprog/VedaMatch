import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Bell, Eye } from 'lucide-react-native';


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
            duration: 500,
            delay: 300,
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
            <Animated.View style={[styles.checkContainer, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.checkCircle}>
                    <Check size={64} color="#FFFFFF" strokeWidth={3} />
                </View>
            </Animated.View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Text style={styles.title}>{t('cafe.success.title')}</Text>
                <Text style={styles.orderNumber}>№ {orderNumber}</Text>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Clock size={24} color="#FF6B00" strokeWidth={1.5} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>{t('cafe.success.wait')}</Text>
                            <Text style={styles.infoValue}>{t('cafe.success.waitDesc')}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Bell size={24} color="#FF6B00" strokeWidth={1.5} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>{t('cafe.success.notif')}</Text>
                            <Text style={styles.infoValue}>{t('cafe.success.notifDesc')}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>💡 {t('cafe.success.useful')}</Text>
                    <Text style={styles.tipsText}>
                        {t('cafe.success.usefulDesc')}
                    </Text>
                </View>

                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleTrackOrder}
                    >
                        <Eye size={20} color="#FFFFFF" strokeWidth={1.5} />
                        <Text style={styles.primaryButtonText}>{t('cafe.success.track')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleBackToMenu}
                    >
                        <Text style={styles.secondaryButtonText}>{t('cafe.cart.backToMenu')}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    checkContainer: {
        marginBottom: 32,
    },
    checkCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 18,
        color: '#FF6B00',
        fontWeight: '600',
        marginBottom: 32,
    },
    infoCard: {
        width: '100%',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    infoLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    infoValue: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#2C2C2E',
        marginVertical: 16,
    },
    tipsCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 32,
    },
    tipsTitle: {
        color: '#FF6B00',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    tipsText: {
        color: '#8E8E93',
        fontSize: 13,
        lineHeight: 18,
    },
    buttons: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FF6B00',
        padding: 16,
        borderRadius: 14,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    secondaryButton: {
        padding: 16,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#8E8E93',
        fontSize: 15,
    },
});

export default OrderSuccessScreen;
