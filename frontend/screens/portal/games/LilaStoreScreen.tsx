import React from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { HeartHandshake, Sparkles, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import {
    getLilaBootstrap,
    getLilaPreferredStoreCurrency,
    getLilaStoreSpendOptions,
    getLilaStoreSections,
    purchaseLilaStoreItem,
    sendLilaGift,
} from '../../../services/lilaGameService';
import type { LilaBalanceSummary, LilaBootstrap, LilaCurrency, LilaStoreItem, LilaStoreSpendOption } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaPrimaryButton, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

const LilaStoreScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const [items, setItems] = React.useState<LilaStoreItem[]>([]);
    const [balance, setBalance] = React.useState<LilaBalanceSummary>({ bonus: 0, real: 0 });
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [busyCode, setBusyCode] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const loadStore = React.useCallback(async () => {
        try {
            setError(null);
            const next = await getLilaBootstrap(i18n.language);
            setBootstrap(next);
            setItems(next.storeItems);
            setBalance({ bonus: next.bonusBalance, real: next.realBalance });
        } catch (loadError: any) {
            setError(loadError?.response?.data?.error || loadError?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [i18n.language, t]);

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            loadStore();
        }, [loadStore]),
    );

    const formatSpendLabel = React.useCallback((option: LilaStoreSpendOption) => (
        option.currency === 'bonus'
            ? t('portal.lila.store.bonusPrice', { amount: option.amount })
            : t('portal.lila.store.realPrice', { amount: option.amount })
    ), [t]);

    const getItemPriceLabel = React.useCallback((item: LilaStoreItem) => {
        if (item.bonusPrice > 0 && item.realPrice > 0) {
            return `${t('portal.lila.store.bonusPrice', { amount: item.bonusPrice })} / ${t('portal.lila.store.realPrice', { amount: item.realPrice })}`;
        }
        if (item.bonusPrice > 0) {
            return t('portal.lila.store.bonusPrice', { amount: item.bonusPrice });
        }
        if (item.realPrice > 0) {
            return t('portal.lila.store.realPrice', { amount: item.realPrice });
        }
        return t('portal.lila.store.priceUnavailable');
    }, [t]);

    const executeItemAction = React.useCallback(async (item: LilaStoreItem, currency: LilaCurrency) => {
        try {
            setBusyCode(item.code);
            if (item.type === 'gift' && user?.ID) {
                await sendLilaGift(user.ID, item.code, currency);
            } else {
                await purchaseLilaStoreItem(item.code, currency);
            }
            await loadStore();
            Alert.alert(
                t('common.success'),
                item.type === 'gift' ? t('portal.lila.store.giftStoredSuccess', { item: item.name }) : item.name,
            );
        } catch (purchaseError: any) {
            Alert.alert(t('common.error'), purchaseError?.response?.data?.error || purchaseError?.message || t('common.error'));
        } finally {
            setBusyCode(null);
        }
    }, [loadStore, t, user?.ID]);

    const showInsufficientBalance = React.useCallback((options: LilaStoreSpendOption[]) => {
        const first = options[0];
        if (first) {
            Alert.alert(
                t('portal.lila.store.insufficientTitle'),
                t('portal.lila.store.insufficientMessage', { amount: formatSpendLabel(first) }),
            );
            return;
        }
        Alert.alert(t('common.error'), t('portal.lila.store.priceUnavailable'));
    }, [formatSpendLabel, t]);

    const handleItemPress = React.useCallback((item: LilaStoreItem) => {
        const configuredOptions = getLilaStoreSpendOptions(item, balance);
        const affordableOptions = configuredOptions.filter((option) => option.affordable);
        const fallbackCurrency = getLilaPreferredStoreCurrency(item);

        if (!configuredOptions.length || !fallbackCurrency) {
            Alert.alert(t('common.error'), t('portal.lila.store.priceUnavailable'));
            return;
        }

        if (!affordableOptions.length) {
            showInsufficientBalance(configuredOptions);
            return;
        }

        if (affordableOptions.length === 1) {
            const [option] = affordableOptions;
            Alert.alert(
                t('portal.lila.store.confirmTitle'),
                t(item.type === 'gift' ? 'portal.lila.store.confirmGiftMessage' : 'portal.lila.store.confirmPurchaseMessage', {
                    item: item.name,
                    amount: formatSpendLabel(option),
                }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('portal.lila.store.confirmAction'),
                        onPress: () => {
                            executeItemAction(item, option.currency);
                        },
                    },
                ],
            );
            return;
        }

        Alert.alert(
            t('portal.lila.store.chooseCurrencyTitle'),
            t(item.type === 'gift' ? 'portal.lila.store.chooseCurrencyGiftMessage' : 'portal.lila.store.chooseCurrencyPurchaseMessage', {
                item: item.name,
            }),
            [
                ...affordableOptions.map((option) => ({
                    text: formatSpendLabel(option),
                    onPress: () => {
                        executeItemAction(item, option.currency);
                    },
                })),
                { text: t('common.cancel'), style: 'cancel' as const },
            ],
        );
    }, [balance, executeItemAction, formatSpendLabel, showInsufficientBalance, t]);

    const sections = getLilaStoreSections(items);
    const ownedItemByCode = React.useMemo(() => {
        const next = new Map<string, string>();
        (bootstrap?.ownedItems || []).forEach((item) => {
            if (item.code) {
                next.set(item.code, item.state);
            }
        });
        return next;
    }, [bootstrap?.ownedItems]);

    const getStateBadge = React.useCallback((code: string) => {
        const state = ownedItemByCode.get(code);
        if (!state) {
            return null;
        }
        switch (state) {
        case 'equipped':
            return t('portal.lila.store.badges.equipped');
        case 'active':
            return t('portal.lila.store.badges.active');
        case 'stored':
            return t('portal.lila.store.badges.stored');
        case 'expired':
            return t('portal.lila.store.badges.expired');
        default:
            return t('portal.lila.store.badges.owned');
        }
    }, [ownedItemByCode, t]);

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
                        {section.items.map((item) => {
                            const ownershipState = ownedItemByCode.get(item.code);
                            const isUniqueOwned = item.type !== 'gift' && item.type !== 'siddhi' && Boolean(ownershipState) && ownershipState !== 'expired';
                            const stateBadge = getStateBadge(item.code);

                            return (
                                <Pressable
                                    key={item.code}
                                    style={[styles.itemRow, (!getLilaPreferredStoreCurrency(item) || isUniqueOwned) ? styles.itemRowDisabled : null]}
                                    disabled={!getLilaPreferredStoreCurrency(item) || isUniqueOwned}
                                    onPress={() => handleItemPress(item)}
                                >
                                    <View style={styles.itemCopy}>
                                        <View style={styles.itemTitleRow}>
                                            <Text style={styles.itemTitle}>{item.name}</Text>
                                            {stateBadge ? <Text style={styles.itemStateBadge}>{stateBadge}</Text> : null}
                                        </View>
                                        <Text style={styles.itemMeta}>{getItemPriceLabel(item)}</Text>
                                        {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
                                        {item.type === 'gift' ? (
                                            <Text style={styles.itemHint}>{t('portal.lila.store.selfGiftHint')}</Text>
                                        ) : null}
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
                            );
                        })}
                    </LilaCard>
                </React.Fragment>
            ))}

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={loadStore} />
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
    itemRowDisabled: {
        opacity: 0.56,
    },
    itemCopy: {
        flex: 1,
        gap: 4,
    },
    itemTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    itemTitle: {
        color: LILA_COLORS.ink,
        fontSize: 15,
        fontWeight: '700',
    },
    itemStateBadge: {
        color: LILA_COLORS.saffron,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
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
    itemHint: {
        color: 'rgba(42,24,16,0.56)',
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
