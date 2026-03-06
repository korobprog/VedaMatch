import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { supportService, SupportConfig } from '../../services/supportService';
import { useUser } from '../../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportHome'>;

const DEFAULT_SUPPORT_BOT_URL = 'https://t.me/vedamatch_bot';

const defaultConfig: SupportConfig = {
    appEntryEnabled: true,
    appEntryRolloutPercent: 100,
    appEntryEligible: true,
    telegramBotUrl: DEFAULT_SUPPORT_BOT_URL,
    channelUrl: '',
    slaTextRu: 'AI replies instantly, operator response during business hours is within 4 hours.',
    slaTextEn: 'AI replies instantly, operator response during business hours is within 4 hours.',
    slaTextHi: 'AI तुरंत जवाब देता है, और कार्य समय में ऑपरेटर 4 घंटे के भीतर जवाब देता है।',
    languages: ['ru', 'en', 'hi'],
    channels: {
        telegram: false,
        inAppTicket: true,
    },
};

const supportHomeCopy = {
    ru: {
        back: 'Back',
        title: 'VedaMatch Support',
        subtitle: 'Technical issues, product navigation, and feedback.',
        moderationTitle: 'UGC MODERATION',
        moderationText: 'For content/user complaints, use "Create ticket". Support is handled in chat, without email.',
        slaTitle: 'SLA',
        loading: 'Loading support channels…',
        openTelegram: 'Open Telegram support',
        createTicket: 'Create ticket without Telegram',
        myTickets: 'My tickets',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        alertTitle: 'Support',
        alertCantOpenLink: 'Failed to open Telegram link.',
    },
    en: {
        back: 'Back',
        title: 'VedaMatch Support',
        subtitle: 'Technical issues, product navigation, and feedback.',
        moderationTitle: 'UGC MODERATION',
        moderationText: 'For content/user complaints, use "Create ticket". Support is handled in chat, without email.',
        slaTitle: 'SLA',
        loading: 'Loading support channels…',
        openTelegram: 'Open Telegram support',
        createTicket: 'Create ticket without Telegram',
        myTickets: 'My tickets',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        alertTitle: 'Support',
        alertCantOpenLink: 'Failed to open Telegram link.',
    },
    hi: {
        back: 'वापस',
        title: 'VedaMatch सहायता',
        subtitle: 'तकनीकी समस्याएँ, प्रोडक्ट नेविगेशन और सुधार हेतु फीडबैक।',
        moderationTitle: 'UGC मॉडरेशन',
        moderationText: 'कंटेंट/यूज़र शिकायत के लिए "टिकट बनाएं" उपयोग करें। सहायता चैट में होती है, ईमेल से नहीं।',
        slaTitle: 'SLA',
        loading: 'सहायता चैनल लोड हो रहे हैं…',
        openTelegram: 'Telegram सहायता खोलें',
        createTicket: 'Telegram के बिना टिकट बनाएं',
        myTickets: 'मेरे टिकट',
        refresh: 'रीफ्रेश',
        refreshing: 'रीफ्रेश हो रहा है…',
        alertTitle: 'सहायता',
        alertCantOpenLink: 'Telegram लिंक नहीं खुल सका।',
    },
} as const;

const normalizeSupportHomeLanguage = (language?: string): 'ru' | 'en' | 'hi' => {
    const lower = String(language || '').trim().toLowerCase();
    if (lower.startsWith('ru')) {
        return 'ru';
    }
    if (lower.startsWith('hi')) {
        return 'hi';
    }
    return 'en';
};

const getSupportHomeCopy = (language?: string) => supportHomeCopy[normalizeSupportHomeLanguage(language)];

export const SupportHomeScreen: React.FC<Props> = ({ navigation, route }) => {
    const { i18n } = useTranslation();
    const { isLoggedIn } = useUser();
    const [config, setConfig] = useState<SupportConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const handledConversationRef = useRef<number | null>(null);

    const loadConfig = async (silent: boolean) => {
        if (!silent) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        try {
            const next = await supportService.getConfig();
            setConfig({ ...defaultConfig, ...next });
        } catch (error) {
            console.warn('[SupportHome] failed to load config:', error);
        } finally {
            if (!silent) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    };

    useEffect(() => {
        loadConfig(false);
    }, []);

    useEffect(() => {
        const conversationId = route.params?.conversationId;
        if (!conversationId || !isLoggedIn) {
            return;
        }
        if (handledConversationRef.current === conversationId) {
            return;
        }
        handledConversationRef.current = conversationId;
        navigation.navigate('SupportConversation', { conversationId });
    }, [route.params?.conversationId, isLoggedIn, navigation]);

    const ui = useMemo(() => getSupportHomeCopy(i18n.language), [i18n.language]);
    const slaText = useMemo(() => {
        const lang = normalizeSupportHomeLanguage(i18n.language);
        if (lang === 'ru') {
            return config.slaTextRu;
        }
        if (lang === 'hi') {
            return config.slaTextHi || config.slaTextEn;
        }
        return config.slaTextEn;
    }, [config.slaTextEn, config.slaTextHi, config.slaTextRu, i18n.language]);
    const inAppTicketAvailable = !!config.channels.inAppTicket;

    const openTelegram = async () => {
        const target = config.telegramBotUrl || config.channelUrl || DEFAULT_SUPPORT_BOT_URL;
        try {
            const canOpen = await Linking.canOpenURL(target);
            if (!canOpen) {
                Alert.alert(ui.alertTitle, ui.alertCantOpenLink);
                return;
            }
            await Linking.openURL(target);
        } catch {
            Alert.alert(ui.alertTitle, ui.alertCantOpenLink);
        }
    };

    const openTicketForm = () => {
        navigation.navigate('SupportTicketForm', {
            entryPoint: route.params?.entryPoint || 'portal',
        });
    };

    const handleBackPress = () => {
        if (isLoggedIn) {
            navigation.navigate('Portal');
            return;
        }
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Login');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.8}>
                    <ArrowLeft size={18} color="#0F172A" />
                    <Text style={styles.backButtonText}>{ui.back}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{ui.title}</Text>
                <Text style={styles.subtitle}>
                    {ui.subtitle}
                </Text>
                <View style={styles.moderationBox}>
                    <Text style={styles.moderationTitle}>{ui.moderationTitle}</Text>
                    <Text style={styles.moderationText}>
                        {ui.moderationText}
                    </Text>
                </View>

                <View style={styles.slaBox}>
                    <Text style={styles.slaTitle}>{ui.slaTitle}</Text>
                    <Text style={styles.slaText}>{slaText}</Text>
                </View>

                {loading ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.loaderText}>{ui.loading}</Text>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity style={styles.primaryButton} onPress={openTelegram} activeOpacity={0.9}>
                            <Text style={styles.primaryButtonText}>{ui.openTelegram}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, !inAppTicketAvailable && styles.secondaryButtonDisabled]}
                            onPress={openTicketForm}
                            activeOpacity={0.9}
                            disabled={!inAppTicketAvailable}
                        >
                            <Text style={styles.secondaryButtonText}>{ui.createTicket}</Text>
                        </TouchableOpacity>

                        {isLoggedIn ? (
                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => navigation.navigate('SupportInbox')}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.linkButtonText}>{ui.myTickets}</Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={() => loadConfig(true)}
                            disabled={refreshing}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.refreshText}>{refreshing ? ui.refreshing : ui.refresh}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        marginBottom: 10,
    },
    backButtonText: {
        color: '#0F172A',
        fontSize: 15,
        fontWeight: '700',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
    },
    subtitle: {
        marginTop: 8,
        fontSize: 15,
        lineHeight: 22,
        color: '#334155',
    },
    moderationBox: {
        marginTop: 14,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FDBA74',
        borderRadius: 14,
        padding: 12,
        gap: 3,
    },
    moderationTitle: {
        color: '#9A3412',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    moderationText: {
        color: '#7C2D12',
        fontSize: 13,
        lineHeight: 18,
    },
    slaBox: {
        marginTop: 20,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 14,
        padding: 14,
    },
    slaTitle: {
        color: '#1D4ED8',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    slaText: {
        color: '#1E3A8A',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    loaderWrap: {
        marginTop: 32,
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 10,
        color: '#475569',
        fontSize: 14,
    },
    primaryButton: {
        marginTop: 26,
        backgroundColor: '#2563EB',
        borderRadius: 14,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        marginTop: 12,
        backgroundColor: '#FFFFFF',
        borderColor: '#2563EB',
        borderWidth: 1,
        borderRadius: 14,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    secondaryButtonText: {
        color: '#1E40AF',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButtonDisabled: {
        opacity: 0.55,
    },
    rolloutHint: {
        marginTop: 8,
        color: '#64748B',
        fontSize: 12,
        lineHeight: 16,
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkButtonText: {
        color: '#0F172A',
        fontWeight: '700',
        fontSize: 15,
    },
    refreshButton: {
        marginTop: 12,
        alignItems: 'center',
    },
    refreshText: {
        color: '#64748B',
        fontSize: 13,
    },
});

export default SupportHomeScreen;
