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

function formatPillAmount(value: number, compact: boolean): string {
    if (!compact) {
        return value.toLocaleString('ru-RU');
    }

    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
        const shortened = (value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1);
        return `${shortened.replace(/\.0$/, '')}M`;
    }
    if (abs >= 1_000) {
        const shortened = (value / 1_000).toFixed(abs >= 10_000 ? 0 : 1);
        return `${shortened.replace(/\.0$/, '')}K`;
    }
    return value.toLocaleString('ru-RU');
}

export const BalancePill: React.FC<BalancePillProps> = ({
    size = 'medium',
    showPending = false,
    lightMode = false,
}) => {
    const navigation = useNavigation<any>();
    const { wallet, loading, regularBalance, bonusBalance } = useWallet();

    const handlePress = () => {
        navigation.navigate('Wallet');
    };

    const isSmall = size === 'small';
    const textColor = lightMode ? '#FFFFFF' : '#FFB02E';
    const bgColor = lightMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,176,46,0.12)';
    const borderColor = lightMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,176,46,0.25)';
    const pendingBalance = wallet?.pendingBalance ?? 0;

    const regularText = formatPillAmount(regularBalance, isSmall);
    const bonusText = formatPillAmount(bonusBalance, isSmall);

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.container,
                {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: 1.5,
                },
                isSmall && styles.containerSmall,
            ]}
            activeOpacity={0.7}
        >
            <Wallet
                size={isSmall ? 13 : 15}
                color={textColor}
                strokeWidth={2.5}
            />

            {loading ? (
                <ActivityIndicator size="small" color={textColor} style={{ marginLeft: 2 }} />
            ) : (
                <View style={styles.textColumn}>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.balanceText,
                            { color: textColor },
                            isSmall && styles.balanceTextSmall,
                        ]}
                    >
                        {regularText}
                    </Text>

                    {bonusBalance > 0 && (
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.bonusText,
                                { color: lightMode ? 'rgba(255,255,255,0.85)' : '#10B981' },
                                isSmall && styles.bonusTextSmall
                            ]}
                        >
                            +{bonusText} B
                        </Text>
                    )}
                </View>
            )}

            {showPending && pendingBalance > 0 && (
                <View style={styles.pendingDot} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        minWidth: 48,
    },
    containerSmall: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 15,
        gap: 4,
        minWidth: 40,
        maxHeight: 32,
    },
    textColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    balanceText: {
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 15,
    },
    balanceTextSmall: {
        fontSize: 12,
        lineHeight: 13,
    },
    bonusText: {
        fontSize: 8.5,
        fontWeight: '700',
        lineHeight: 9,
        marginTop: 0.5,
    },
    bonusTextSmall: {
        fontSize: 7.5,
        lineHeight: 8,
    },
    pendingDot: {
        position: 'absolute',
        top: 2,
        right: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#EF4444',
    },
});

export default BalancePill;
