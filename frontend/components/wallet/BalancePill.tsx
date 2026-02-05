/**
 * BalancePill - Компактная кнопка для отображения баланса LKM
 * Используется в header'ах Portal, Services и других экранов
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useWallet } from '../../context/WalletContext';

interface BalancePillProps {
    size?: 'small' | 'medium';
    showPending?: boolean;
    lightMode?: boolean; // For dark backgrounds
}

export const BalancePill: React.FC<BalancePillProps> = ({
    size = 'medium',
    showPending = false,
    lightMode = false,
}) => {
    const navigation = useNavigation<any>();
    const { wallet, loading } = useWallet();

    const handlePress = () => {
        navigation.navigate('Wallet');
    };

    const isSmall = size === 'small';
    const textColor = lightMode ? '#FFFFFF' : '#F59E0B';
    const bgColor = lightMode ? 'rgba(255,255,255,0.15)' : 'rgba(245,158,11,0.12)';

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.container,
                { backgroundColor: bgColor },
                isSmall && styles.containerSmall,
            ]}
            activeOpacity={0.7}
        >
            <Wallet
                size={isSmall ? 14 : 16}
                color={textColor}
                strokeWidth={2.5}
            />
            {loading ? (
                <ActivityIndicator size="small" color={textColor} style={{ marginLeft: 4 }} />
            ) : (
                <View style={styles.balanceContainer}>
                    <Text style={[
                        styles.balanceText,
                        { color: textColor },
                        isSmall && styles.balanceTextSmall,
                    ]}>
                        {wallet?.balance ?? 0}
                    </Text>
                    {showPending && (wallet?.pendingBalance ?? 0) > 0 && (
                        <Text style={[styles.pendingText, isSmall && styles.pendingTextSmall]}>
                            +{wallet?.pendingBalance ?? 0}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    containerSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    balanceText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Cinzel-Bold',
    },
    balanceTextSmall: {
        fontSize: 12,
    },
    pendingText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    pendingTextSmall: {
        fontSize: 9,
    },
});

export default BalancePill;
