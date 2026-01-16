import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, useColorScheme
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSettings } from '../../../context/SettingsContext';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';

type RouteParams = {
    OrderSuccess: {
        orderId: number;
        orderNumber: string;
    };
};

export const OrderSuccessScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'OrderSuccess'>>();

    const orderId = route.params?.orderId;
    const orderNumber = route.params?.orderNumber;

    const { isDarkMode, vTheme } = useSettings();
    const colors = vTheme.colors;

    const handleViewOrder = () => {
        navigation.replace('OrderDetails', { orderId });
    };

    const handleContinueShopping = () => {
        navigation.navigate('MarketHome');
    };

    const handleGoToMessages = () => {
        navigation.navigate('Messages');
    };

    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }]}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' + '20' }]}>
                    <Text style={styles.icon}>✅</Text>
                </View>

                <Text style={[styles.title, { color: isDarkMode ? '#fff' : colors.text }]}>
                    Order Placed!
                </Text>

                <Text style={[styles.orderNumber, { color: colors.primary }]}>
                    #{orderNumber}
                </Text>

                <Text style={[styles.description, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                    Your order has been successfully placed. The seller has been notified and will contact you soon via messenger.
                </Text>

                <View style={[styles.infoCard, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={{ fontSize: 24 }}>💬</Text>
                    <View style={styles.infoContent}>
                        <Text style={[styles.infoTitle, { color: colors.primary }]}>
                            What's Next?
                        </Text>
                        <Text style={[styles.infoText, { color: isDarkMode ? '#ddd' : colors.text }]}>
                            The seller will reach out to you through our messenger to discuss payment and delivery details.
                        </Text>
                    </View>
                </View>

                <View style={styles.steps}>
                    <View style={styles.step}>
                        <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.stepNumberText}>1</Text>
                        </View>
                        <Text style={[styles.stepText, { color: isDarkMode ? '#ddd' : colors.text }]}>
                            Seller confirms your order
                        </Text>
                    </View>
                    <View style={styles.step}>
                        <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.stepNumberText}>2</Text>
                        </View>
                        <Text style={[styles.stepText, { color: isDarkMode ? '#ddd' : colors.text }]}>
                            Agree on payment method
                        </Text>
                    </View>
                    <View style={styles.step}>
                        <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.stepNumberText}>3</Text>
                        </View>
                        <Text style={[styles.stepText, { color: isDarkMode ? '#ddd' : colors.text }]}>
                            Receive your order
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.gradientStart }]}
                    onPress={handleGoToMessages}
                >
                    <Text style={styles.primaryBtnText}>💬 Go to Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                    onPress={handleViewOrder}
                >
                    <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                        View Order Details
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleContinueShopping}>
                    <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                        Continue Shopping →
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        width: '100%',
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
    },
    steps: {
        width: '100%',
        gap: 12,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepText: {
        fontSize: 14,
    },
    actions: {
        gap: 12,
        paddingBottom: 20,
    },
    primaryBtn: {
        padding: 18,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 4,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        padding: 16,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 2,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    linkText: {
        textAlign: 'center',
        fontSize: 15,
        marginTop: 8,
    },
});
