import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, ChevronRight, Link2, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { usePressFeedback } from '../../hooks/usePressFeedback';
import type { RootStackParamList } from '../../types/navigation';
import {
    clearPendingSocialAuthState,
    getPendingSocialAuthState,
    rememberPendingSocialAuthState,
} from '../../services/pendingSocialAuthService';
import {
    createTelegramLinkSession,
    createVKAuthSession,
    doesTelegramAuthCallbackStateMatch,
    doesVKAuthCallbackStateMatch,
    finalizeTelegramLink,
    finalizeVKLink,
    getLinkedAuthProviders,
    isTelegramAuthCallbackUrl,
    isVKAuthCallbackUrl,
    linkGoogleAccount,
    type LinkedAuthProvider,
    type LinkedAuthProvidersResponse,
    unlinkAuthProvider,
} from '../../services/socialAuthService';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkedAccounts'>;

const PROVIDERS: Array<{ provider: LinkedAuthProvider; brandColor: string }> = [
    { provider: 'google', brandColor: '#DB4437' },
    { provider: 'vk', brandColor: '#0077FF' },
    { provider: 'telegram', brandColor: '#229ED9' },
];

const LinkedAccountsScreen: React.FC<Props> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user, updateUserProfile } = useUser();
    const { colors } = useRoleTheme(user?.role, true);
    const triggerTapFeedback = usePressFeedback();
    const [providersResponse, setProvidersResponse] = useState<LinkedAuthProvidersResponse | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingProvider, setLoadingProvider] = useState<LinkedAuthProvider | null>(null);
    const [vkAuthState, setVKAuthState] = useState('');
    const [telegramAuthState, setTelegramAuthState] = useState('');
    const lastHandledVKCallbackRef = useRef('');
    const lastHandledTelegramCallbackRef = useRef('');

    const syncUser = useCallback(async (nextUser: Record<string, any>) => {
        await updateUserProfile(nextUser as any);
    }, [updateUserProfile]);

    const loadProviders = useCallback(async () => {
        const response = await getLinkedAuthProviders();
        setProvidersResponse(response);
    }, []);

    useEffect(() => {
        loadProviders().catch((error) => {
            console.warn('[LinkedAccounts] Failed to load providers:', error);
        });
    }, [loadProviders]);

    useEffect(() => {
        getPendingSocialAuthState('vk', 'link')
            .then((state) => {
                if (!state) return;
                setVKAuthState((current) => current || state);
            })
            .catch(() => undefined);

        getPendingSocialAuthState('telegram', 'link')
            .then((state) => {
                if (!state) return;
                setTelegramAuthState((current) => current || state);
            })
            .catch(() => undefined);
    }, []);

    const refreshProviders = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await loadProviders();
        } finally {
            setIsRefreshing(false);
        }
    }, [loadProviders]);

    const completeLink = useCallback(async (
        result: { user: Record<string, any>; providers: LinkedAuthProvidersResponse },
        successKey: string,
    ) => {
        await syncUser(result.user);
        setProvidersResponse(result.providers);
        Alert.alert(
            t('common.success', { defaultValue: 'Success' }),
            t(successKey),
        );
    }, [syncUser, t]);

    const handleGoogleLink = useCallback(async () => {
        triggerTapFeedback();
        setLoadingProvider('google');
        try {
            const result = await linkGoogleAccount();
            await completeLink(result, 'settings.linkedAccounts.alerts.googleLinked');
        } catch (error: any) {
            const message = error?.response?.data?.error || t('settings.linkedAccounts.alerts.googleLinkFailed');
            Alert.alert(t('common.error', { defaultValue: 'Error' }), message);
        } finally {
            setLoadingProvider(null);
        }
    }, [completeLink, t, triggerTapFeedback]);

    const handleVKLink = useCallback(async () => {
        triggerTapFeedback();
        setLoadingProvider('vk');
        try {
            const session = createVKAuthSession();
            await rememberPendingSocialAuthState('vk', 'link', session.state);
            setVKAuthState(session.state);
            await Linking.openURL(session.authorizeUrl);
        } catch (error: any) {
            setVKAuthState('');
            await clearPendingSocialAuthState('vk', 'link').catch(() => undefined);
            const message = error?.message || t('settings.linkedAccounts.alerts.vkLinkFailed');
            Alert.alert(t('common.error', { defaultValue: 'Error' }), message);
            setLoadingProvider(null);
        }
    }, [t, triggerTapFeedback]);

    const handleTelegramLink = useCallback(async () => {
        triggerTapFeedback();
        setLoadingProvider('telegram');
        try {
            const session = await createTelegramLinkSession();
            await rememberPendingSocialAuthState('telegram', 'link', session.state);
            setTelegramAuthState(session.state);
            await Linking.openURL(session.launchUrl);
        } catch (error: any) {
            setTelegramAuthState('');
            await clearPendingSocialAuthState('telegram', 'link').catch(() => undefined);
            const message = error?.response?.data?.error || t('settings.linkedAccounts.alerts.telegramLinkFailed');
            Alert.alert(t('common.error', { defaultValue: 'Error' }), message);
            setLoadingProvider(null);
        }
    }, [t, triggerTapFeedback]);

    const handleUnlink = useCallback((provider: LinkedAuthProvider) => {
        triggerTapFeedback();
        Alert.alert(
            t('settings.linkedAccounts.alerts.unlinkTitle'),
            t('settings.linkedAccounts.alerts.unlinkMessage', {
                provider: t(`settings.linkedAccounts.providers.${provider}`),
            }),
            [
                { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                {
                    text: t('settings.linkedAccounts.actions.unlink'),
                    style: 'destructive',
                    onPress: async () => {
                        setLoadingProvider(provider);
                        try {
                            const result = await unlinkAuthProvider(provider);
                            await completeLink(result, 'settings.linkedAccounts.alerts.unlinked');
                        } catch (error: any) {
                            const backendMessage = error?.response?.data?.error;
                            const errorCode = error?.response?.data?.errorCode;
                            const fallbackMessage = errorCode === 'AUTH_PROVIDER_LAST_METHOD'
                                ? t('settings.linkedAccounts.alerts.lastMethodBlocked')
                                : t('settings.linkedAccounts.alerts.unlinkFailed');
                            Alert.alert(
                                t('common.error', { defaultValue: 'Error' }),
                                backendMessage || fallbackMessage,
                            );
                        } finally {
                            setLoadingProvider(null);
                        }
                    },
                },
            ],
        );
    }, [completeLink, t, triggerTapFeedback]);

    const handleProviderPress = useCallback(async (provider: LinkedAuthProvider, linked: boolean) => {
        if (linked) {
            handleUnlink(provider);
            return;
        }

        if (provider === 'google') {
            await handleGoogleLink();
            return;
        }
        if (provider === 'vk') {
            await handleVKLink();
            return;
        }
        await handleTelegramLink();
    }, [handleGoogleLink, handleTelegramLink, handleUnlink, handleVKLink]);

    const handleVKAuthComplete = useCallback(async (callbackUrl: string) => {
        try {
            const result = await finalizeVKLink(callbackUrl, vkAuthState);
            setVKAuthState('');
            await clearPendingSocialAuthState('vk', 'link').catch(() => undefined);
            await completeLink(result, 'settings.linkedAccounts.alerts.vkLinked');
        } catch (error: any) {
            setVKAuthState('');
            await clearPendingSocialAuthState('vk', 'link').catch(() => undefined);
            const message = error?.response?.data?.error || t('settings.linkedAccounts.alerts.vkLinkFailed');
            Alert.alert(t('common.error', { defaultValue: 'Error' }), message);
        } finally {
            setLoadingProvider(null);
        }
    }, [completeLink, t, vkAuthState]);

    const handleTelegramAuthComplete = useCallback(async (callbackUrl: string) => {
        try {
            const result = await finalizeTelegramLink(callbackUrl, telegramAuthState);
            setTelegramAuthState('');
            await clearPendingSocialAuthState('telegram', 'link').catch(() => undefined);
            await completeLink(result, 'settings.linkedAccounts.alerts.telegramLinked');
        } catch (error: any) {
            setTelegramAuthState('');
            await clearPendingSocialAuthState('telegram', 'link').catch(() => undefined);
            const message = error?.response?.data?.error || t('settings.linkedAccounts.alerts.telegramLinkFailed');
            Alert.alert(t('common.error', { defaultValue: 'Error' }), message);
        } finally {
            setLoadingProvider(null);
        }
    }, [completeLink, t, telegramAuthState]);

    useEffect(() => {
        if (!vkAuthState) {
            lastHandledVKCallbackRef.current = '';
            return undefined;
        }

        const maybeHandleVKCallback = (url?: string | null) => {
            const nextUrl = String(url || '').trim();
            if (
                !nextUrl
                || !isVKAuthCallbackUrl(nextUrl)
                || !doesVKAuthCallbackStateMatch(nextUrl, vkAuthState)
                || lastHandledVKCallbackRef.current === nextUrl
            ) {
                return;
            }
            lastHandledVKCallbackRef.current = nextUrl;
            handleVKAuthComplete(nextUrl).catch(() => undefined);
        };

        Linking.getInitialURL().then(maybeHandleVKCallback).catch(() => undefined);
        const subscription = Linking.addEventListener('url', ({ url }) => maybeHandleVKCallback(url));
        return () => subscription.remove();
    }, [handleVKAuthComplete, vkAuthState]);

    useEffect(() => {
        if (!telegramAuthState) {
            lastHandledTelegramCallbackRef.current = '';
            return undefined;
        }

        const maybeHandleTelegramCallback = (url?: string | null) => {
            const nextUrl = String(url || '').trim();
            if (
                !nextUrl
                || !isTelegramAuthCallbackUrl(nextUrl)
                || !doesTelegramAuthCallbackStateMatch(nextUrl, telegramAuthState)
                || lastHandledTelegramCallbackRef.current === nextUrl
            ) {
                return;
            }
            lastHandledTelegramCallbackRef.current = nextUrl;
            handleTelegramAuthComplete(nextUrl).catch(() => undefined);
        };

        Linking.getInitialURL().then(maybeHandleTelegramCallback).catch(() => undefined);
        const subscription = Linking.addEventListener('url', ({ url }) => maybeHandleTelegramCallback(url));
        return () => subscription.remove();
    }, [handleTelegramAuthComplete, telegramAuthState]);

    const providerMap = useMemo(() => {
        const mapped = new Map<LinkedAuthProvider, LinkedAuthProvidersResponse['providers'][number]>();
        for (const provider of providersResponse?.providers || []) {
            mapped.set(provider.provider, provider);
        }
        return mapped;
    }, [providersResponse]);

    const themedStyles = useMemo(() => StyleSheet.create({
        headerSurface: {
            borderBottomColor: colors.border,
            backgroundColor: colors.surfaceElevated,
        },
        heroSurface: {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
        },
        heroBadge: { backgroundColor: colors.accentSoft },
        infoSurface: {
            backgroundColor: colors.accentSoft,
            borderColor: colors.border,
        },
        providerSurface: {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
        },
        textPrimary: { color: colors.textPrimary },
        textSecondary: { color: colors.textSecondary },
        actionLink: { color: colors.accent },
    }), [colors.accent, colors.accentSoft, colors.border, colors.surfaceElevated, colors.textPrimary, colors.textSecondary]);

    return (
        <ScreenScaffold variant="settings" enableAura>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <View style={[styles.header, themedStyles.headerSurface]}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.88}
                        onPress={() => {
                            triggerTapFeedback();
                            navigation.goBack();
                        }}
                        style={styles.backButton}
                    >
                        <Text style={[styles.backText, themedStyles.textPrimary]}>← {t('common.back', { defaultValue: 'Back' })}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, themedStyles.textPrimary]}>
                        {t('settings.linkedAccounts.title')}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshProviders} />}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.heroCard, themedStyles.heroSurface]}>
                        <View style={[styles.heroIcon, themedStyles.heroBadge]}>
                            <ShieldCheck size={22} color={colors.accent} />
                        </View>
                        <View style={styles.heroContent}>
                            <Text style={[styles.heroTitle, themedStyles.textPrimary]}>
                                {t('settings.linkedAccounts.heroTitle')}
                            </Text>
                            <Text style={[styles.heroSubtitle, themedStyles.textSecondary]}>
                                {t('settings.linkedAccounts.heroSubtitle')}
                            </Text>
                        </View>
                    </View>

                    {providersResponse?.hasPassword && (
                        <View style={[styles.infoCard, themedStyles.infoSurface]}>
                            <Text style={[styles.infoTitle, themedStyles.textPrimary]}>
                                {t('settings.linkedAccounts.passwordTitle')}
                            </Text>
                            <Text style={[styles.infoText, themedStyles.textSecondary]}>
                                {t('settings.linkedAccounts.passwordDescription')}
                            </Text>
                        </View>
                    )}

                    {!providersResponse ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator color={colors.accent} />
                        </View>
                    ) : (
                        PROVIDERS.map(({ provider, brandColor }) => {
                            const providerState = providerMap.get(provider);
                            const linked = !!providerState?.linked;
                            const isBusy = loadingProvider === provider;
                            return (
                                <TouchableOpacity
                                    key={provider}
                                    activeOpacity={0.9}
                                    disabled={isBusy}
                                    onPress={() => {
                                        handleProviderPress(provider, linked).catch(() => undefined);
                                    }}
                                    style={[styles.providerCard, themedStyles.providerSurface]}
                                >
                                    <View style={[styles.providerBadge, { backgroundColor: `${brandColor}18` }]}>
                                        <Link2 size={18} color={brandColor} />
                                    </View>
                                    <View style={styles.providerContent}>
                                        <View style={styles.providerRow}>
                                                <Text style={[styles.providerTitle, themedStyles.textPrimary]}>
                                                    {t(`settings.linkedAccounts.providers.${provider}`)}
                                                </Text>
                                            <View style={[styles.statusPill, linked ? styles.statusPillLinked : styles.statusPillIdle]}>
                                                {linked && <CheckCircle2 size={14} color="#16A34A" />}
                                                <Text style={[styles.statusText, linked ? styles.statusTextLinked : themedStyles.textSecondary]}>
                                                    {linked
                                                        ? t('settings.linkedAccounts.status.linked')
                                                        : t('settings.linkedAccounts.status.notLinked')}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.providerMeta, themedStyles.textSecondary]}>
                                            {providerState?.label || t(`settings.linkedAccounts.providerHints.${provider}`)}
                                        </Text>
                                        <Text style={[styles.providerAction, linked ? styles.providerActionUnlink : themedStyles.actionLink]}>
                                            {isBusy
                                                ? t('common.loading', { defaultValue: 'Loading...' })
                                                : linked
                                                    ? t('settings.linkedAccounts.actions.unlink')
                                                    : t('settings.linkedAccounts.actions.link')}
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>
        </ScreenScaffold>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backButton: { paddingVertical: 6, paddingRight: 12 },
    backText: { fontSize: 15, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    headerSpacer: { width: 52 },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    heroCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroContent: { flex: 1 },
    heroTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    heroSubtitle: { fontSize: 14, lineHeight: 20 },
    infoCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
    },
    infoTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
    infoText: { fontSize: 13, lineHeight: 18 },
    loadingWrap: { paddingVertical: 40, alignItems: 'center' },
    providerCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    providerBadge: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    providerContent: { flex: 1 },
    providerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 6,
    },
    statusPillLinked: { backgroundColor: 'rgba(34,197,94,0.14)' },
    statusPillIdle: { backgroundColor: 'rgba(148,163,184,0.14)' },
    statusTextLinked: { color: '#15803D' },
    providerActionLink: { fontSize: 13, fontWeight: '700' },
    providerActionUnlink: { color: '#DC2626' },
    providerTitle: { fontSize: 16, fontWeight: '800' },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    statusText: { fontSize: 12, fontWeight: '700' },
    providerMeta: { fontSize: 13, marginBottom: 8 },
    providerAction: { fontSize: 13, fontWeight: '700' },
});

export { LinkedAccountsScreen };
