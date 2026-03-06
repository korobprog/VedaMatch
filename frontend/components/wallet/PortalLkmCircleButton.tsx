import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useWallet } from '../../context/WalletContext';
import { useTranslation } from 'react-i18next';

interface PortalLkmCircleButtonProps {
    onPress: () => void;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    size?: number;
    borderWidth?: number;
    showBlur?: boolean;
    blurAmount?: number;
}

const formatCompactLkm = (value: number, locale: string): string => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
        const shortened = (value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1);
        return `${shortened.replace(/\.0$/, '')}M`;
    }
    if (abs >= 1_000) {
        const shortened = (value / 1_000).toFixed(abs >= 10_000 ? 0 : 1);
        return `${shortened.replace(/\.0$/, '')}K`;
    }
    return value.toLocaleString(locale);
};

export const PortalLkmCircleButton: React.FC<PortalLkmCircleButtonProps> = ({
    onPress,
    backgroundColor,
    borderColor,
    textColor,
    size = 36,
    borderWidth = 1,
    showBlur = false,
    blurAmount = 10,
}) => {
    const { i18n } = useTranslation();
    const { regularBalance } = useWallet();
    const locale = i18n.language?.startsWith('ru') ? 'ru-RU' : i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-US';
    const balanceLabel = useMemo(() => formatCompactLkm(regularBalance, locale), [locale, regularBalance]);
    const isCompact = size <= 36;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.button,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth,
                    backgroundColor,
                    borderColor,
                },
            ]}
            activeOpacity={0.9}
        >
            {showBlur && (
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={blurAmount}
                    reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                />
            )}
            <View style={styles.content}>
                <Text
                    style={[
                        styles.label,
                        {
                            color: textColor,
                            fontSize: isCompact ? 7 : 8,
                            lineHeight: isCompact ? 8 : 9,
                        },
                    ]}
                >
                    LKM
                </Text>
                <Text
                    style={[
                        styles.amount,
                        {
                            color: textColor,
                            fontSize: isCompact ? 10 : 11,
                            lineHeight: isCompact ? 11 : 12,
                            maxWidth: size - 6,
                        },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    {balanceLabel}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    label: {
        fontWeight: '700',
        letterSpacing: 0.25,
    },
    amount: {
        fontWeight: '800',
    },
});

export default PortalLkmCircleButton;
