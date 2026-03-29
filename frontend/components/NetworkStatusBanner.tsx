import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../context/NetworkStatusContext';

type Props = {
    currentRouteName?: string;
};

export const NetworkStatusBanner: React.FC<Props> = ({ currentRouteName }) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { status, showVpnHint } = useNetworkStatus();

    const hidden = status === 'healthy' || currentRouteName === 'CallScreen';
    const copy = useMemo(() => {
        if (status === 'offline') {
            return {
                title: t('networkBanner.offline.title'),
                body: t('networkBanner.offline.body'),
                tone: styles.offlineCard,
            };
        }
        if (status === 'reconnecting') {
            return {
                title: t('networkBanner.reconnecting.title'),
                body: t('networkBanner.reconnecting.body'),
                tone: styles.reconnectingCard,
            };
        }
        return {
            title: t('networkBanner.unstable.title'),
            body: t('networkBanner.unstable.body'),
            tone: styles.unstableCard,
        };
    }, [status, t]);

    if (hidden) {
        return null;
    }

    return (
        <View pointerEvents="none" style={[styles.container, { top: Math.max(insets.top, 8) + 6 }]}>
            <View style={[styles.card, copy.tone]}>
                <Text style={styles.title}>{copy.title}</Text>
                <Text style={styles.body}>{copy.body}</Text>
                {showVpnHint ? (
                    <Text style={styles.hint}>{t('networkBanner.vpnHint')}</Text>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        right: 12,
        zIndex: 50,
    },
    card: {
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 5,
    },
    offlineCard: {
        backgroundColor: 'rgba(153, 27, 27, 0.94)',
        borderColor: 'rgba(254, 202, 202, 0.25)',
    },
    reconnectingCard: {
        backgroundColor: 'rgba(30, 64, 175, 0.94)',
        borderColor: 'rgba(191, 219, 254, 0.3)',
    },
    unstableCard: {
        backgroundColor: 'rgba(146, 64, 14, 0.95)',
        borderColor: 'rgba(253, 230, 138, 0.28)',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    body: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 12,
        lineHeight: 16,
        marginTop: 2,
    },
    hint: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 11,
        lineHeight: 15,
        marginTop: 6,
    },
});
