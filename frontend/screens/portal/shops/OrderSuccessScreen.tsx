import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

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

    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>✅</Text>
                </View>

                <Text style={styles.title}>
                    Order Placed!
                </Text>

                <Text style={styles.orderNumber}>
                    #{orderNumber}
                </Text>

                <Text style={styles.description}>
                    Your order has been successfully placed. The seller has been notified and will contact you soon via messenger.
                </Text>

                <View style={styles.infoCard}>
                    <Text style={{ fontSize: 24 }}>💬</Text>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>
                            What's Next?
                        </Text>
                        <Text style={styles.infoText}>
                            The seller will reach out to you through our messenger to discuss payment and delivery details.
                        </Text>
                    </View>
                </View>

                <View style={styles.steps}>
                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>1</Text>
                        </View>
                        <Text style={styles.stepText}>
                            Seller confirms your order
                        </Text>
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>2</Text>
                        </View>
                        <Text style={styles.stepText}>
                            Agree on payment method
                        </Text>
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>3</Text>
                        </View>
                        <Text style={styles.stepText}>
                            Receive your order
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleGoToMessages}
                >
                    <Text style={styles.primaryBtnText}>💬 Go to Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handleViewOrder}
                >
                    <Text style={styles.secondaryBtnText}>
                        View Order Details
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleContinueShopping}>
                    <Text style={styles.linkText}>
                        Continue Shopping →
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
        backgroundColor: colors.background,
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
        backgroundColor: colors.success + '20',
    },
    icon: {
        fontSize: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: colors.textPrimary,
    },
    orderNumber: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: colors.accent,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
        marginBottom: 24,
        color: colors.textSecondary,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        width: '100%',
        backgroundColor: colors.accentSoft,
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        color: colors.accent,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.textPrimary,
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
        backgroundColor: colors.accent,
    },
    stepNumberText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepText: {
        fontSize: 14,
        color: colors.textPrimary,
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
        backgroundColor: colors.accent,
    },
    primaryBtnText: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        padding: 16,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.accent,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.accent,
    },
    linkText: {
        textAlign: 'center',
        fontSize: 15,
        marginTop: 8,
        color: colors.textSecondary,
    },
});
