import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../context/NetworkStatusContext';

type Props = {
    currentRouteName?: string;
};

export const NetworkStatusBanner: React.FC<Props> = ({ currentRouteName }) => {
    const { t } = useTranslation();
    const { status, showVpnHint } = useNetworkStatus();
    const [expanded, setExpanded] = useState(false);

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
    const shouldAllowExpand = status !== 'offline' || showVpnHint;
    const isExpanded = status === 'offline' ? true : expanded;

    useEffect(() => {
        setExpanded(false);
    }, [status]);

    if (hidden) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Pressable
                accessibilityRole={shouldAllowExpand ? 'button' : undefined}
                onPress={shouldAllowExpand ? () => setExpanded((value) => !value) : undefined}
                style={({ pressed }) => [
                    styles.card,
                    copy.tone,
                    shouldAllowExpand && pressed ? styles.cardPressed : null,
                ]}
            >
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{copy.title}</Text>
                    {shouldAllowExpand ? (
                        <Text style={styles.chevron}>{isExpanded ? 'Hide' : 'Details'}</Text>
                    ) : null}
                </View>
                {isExpanded ? (
                    <>
                        <Text style={styles.body}>{copy.body}</Text>
                        {showVpnHint ? (
                            <Text style={styles.hint}>{t('networkBanner.vpnHint')}</Text>
                        ) : null}
                    </>
                ) : null}
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 2,
        zIndex: 10,
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
    cardPressed: {
        opacity: 0.96,
        transform: [{ scale: 0.995 }],
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        flex: 1,
    },
    chevron: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 11,
        fontWeight: '700',
    },
    body: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 12,
        lineHeight: 16,
        marginTop: 6,
    },
    hint: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 11,
        lineHeight: 15,
        marginTop: 6,
    },
});
