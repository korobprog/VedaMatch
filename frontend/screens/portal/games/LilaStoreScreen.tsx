import React from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { HeartHandshake, Sparkles, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import {
    getLilaBalance,
    getLilaStoreItems,
    getLilaStoreSections,
    purchaseLilaStoreItem,
    sendLilaGift,
} from '../../../services/lilaGameService';
import type { LilaBalanceSummary, LilaStoreItem } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaPrimaryButton, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

const LilaStoreScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const [items, setItems] = React.useState<LilaStoreItem[]>([]);
    const [balance, setBalance] = React.useState<LilaBalanceSummary>({ bonus: 0, real: 0 });
    const [loading, setLoading] = React.useState(true);
    const [busyCode, setBusyCode] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const loadStore = React.useCallback(async () => {
        try {
            setError(null);
            const [nextItems, nextBalance] = await Promise.all([
                getLilaStoreItems(i18n.language),
                getLilaBalance(),
            ]);
            setItems(nextItems);
            setBalance(nextBalance);
        } catch (loadError: any) {
            setError(loadError?.response?.data?.error || loadError?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [i18n.language, t]);

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            void loadStore();
        }, [loadStore]),
    );

    const handleItemPress = React.useCallback(async (item: LilaStoreItem) => {
        try {
            setBusyCode(item.code);
            if (item.type === 'gift' && user?.ID) {
                await sendLilaGift(user.ID, item.code, item.canUseBonus ? 'bonus' : 'real');
            } else {
                await purchaseLilaStoreItem(item.code, item.canUseBonus ? 'bonus' : 'real');
            }
            await loadStore();
            Alert.alert(t('common.success'), item.name);
        } catch (purchaseError: any) {
            Alert.alert(t('common.error'), purchaseError?.response?.data?.error || purchaseError?.message || t('common.error'));
        } finally {
            setBusyCode(null);
        }
    }, [loadStore, t, user?.ID]);

    const sections = getLilaStoreSections(items);

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.store.title')}
            subtitle={t('portal.lila.store.subtitle')}
        >
            <LilaCard tone="gold">
                <View style={styles.balanceRow}>
                    <View style={styles.balanceColumn}>
                        <Text style={styles.balanceLabel}>{t('portal.lila.economy.real')}</Text>
                        <Text style={styles.balanceValue}>{balance.real}</Text>
                    </View>
                    <View style={styles.balanceColumn}>
                        <Text style={styles.balanceLabel}>{t('portal.lila.economy.bonus')}</Text>
                        <Text style={styles.balanceValue}>{balance.bonus}</Text>
                    </View>
                </View>
            </LilaCard>

            {loading && !items.length ? (
                <LilaCard>
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.saffron} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                </LilaCard>
            ) : null}

            {sections.map((section) => (
                <React.Fragment key={section.id}>
                    <LilaSectionTitle title={t(`portal.lila.store.sections.${section.id}`)} />
                    <LilaCard>
                        {section.items.map((item) => (
                            <Pressable key={item.code} style={styles.itemRow} onPress={() => void handleItemPress(item)}>
                                <View style={styles.itemCopy}>
                                    <Text style={styles.itemTitle}>{item.name}</Text>
                                    <Text style={styles.itemMeta}>
                                        {item.realPrice > 0
                                            ? t('portal.lila.store.realPrice', { amount: item.realPrice })
                                            : t('portal.lila.store.bonusPrice', { amount: item.bonusPrice || 0 })}
                                    </Text>
                                    {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
                                </View>
                                <View style={styles.itemBadge}>
                                    {busyCode === item.code ? (
                                        <ActivityIndicator color={LILA_COLORS.saffron} />
                                    ) : section.id === 'dharmaFund' || item.type === 'gift' ? (
                                        <HeartHandshake size={16} color={LILA_COLORS.saffron} />
                                    ) : (
                                        <Sparkles size={16} color={LILA_COLORS.saffron} />
                                    )}
                                </View>
                            </Pressable>
                        ))}
                    </LilaCard>
                </React.Fragment>
            ))}

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => void loadStore()} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton label={t('portal.lila.actions.wallet')} onPress={() => navigation.navigate('Wallet')} />
            <LilaCard tone="night">
                <View style={styles.walletHint}>
                    <Wallet size={16} color={LILA_COLORS.parchment} />
                    <Text style={styles.walletHintText}>{t('portal.lila.store.walletHint')}</Text>
                </View>
            </LilaCard>
        </LilaScreenLayout>
    );
};

const styles = StyleSheet.create({
    balanceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    balanceColumn: {
        flex: 1,
    },
    balanceLabel: {
        color: 'rgba(255,244,224,0.76)',
        fontSize: 13,
        fontWeight: '700',
    },
    balanceValue: {
        marginTop: 6,
        color: LILA_COLORS.parchment,
        fontSize: 28,
        fontWeight: '800',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: LILA_COLORS.ink,
        fontSize: 14,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(42,24,16,0.1)',
    },
    itemCopy: {
        flex: 1,
        gap: 4,
    },
    itemTitle: {
        color: LILA_COLORS.ink,
        fontSize: 15,
        fontWeight: '700',
    },
    itemMeta: {
        color: 'rgba(42,24,16,0.68)',
        fontSize: 12,
    },
    itemDescription: {
        color: 'rgba(42,24,16,0.7)',
        fontSize: 12,
        lineHeight: 18,
    },
    itemBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(199,148,47,0.14)',
    },
    walletHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    walletHintText: {
        flex: 1,
        color: LILA_COLORS.parchment,
        fontSize: 14,
        lineHeight: 20,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaStoreScreen;
