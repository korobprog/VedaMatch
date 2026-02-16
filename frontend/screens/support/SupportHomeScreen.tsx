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
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { supportService, SupportConfig } from '../../services/supportService';
import { useUser } from '../../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportHome'>;

const defaultConfig: SupportConfig = {
    appEntryEnabled: true,
    appEntryRolloutPercent: 100,
    appEntryEligible: true,
    telegramBotUrl: '',
    channelUrl: '',
    slaTextRu: 'AI отвечает сразу, оператор в рабочее время — до 4 часов.',
    slaTextEn: 'AI replies instantly, operator response during business hours is within 4 hours.',
    languages: ['ru', 'en'],
    channels: {
        telegram: false,
        inAppTicket: true,
    },
};

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

    const slaText = useMemo(() => {
        return i18n.language?.startsWith('ru') ? config.slaTextRu : config.slaTextEn;
    }, [config.slaTextEn, config.slaTextRu, i18n.language]);
    const hasTelegramChannel = !!(config.telegramBotUrl || config.channelUrl);
    const inAppTicketAvailable = config.channels.inAppTicket && (
        (config.appEntryEnabled && config.appEntryEligible) || !hasTelegramChannel
    );

    const openTelegram = async () => {
        const target = config.telegramBotUrl || config.channelUrl;
        if (!target) {
            Alert.alert('Поддержка', 'Telegram ссылка пока не настроена.');
            return;
        }
        try {
            const canOpen = await Linking.canOpenURL(target);
            if (!canOpen) {
                Alert.alert('Поддержка', 'Не удалось открыть ссылку Telegram.');
                return;
            }
            await Linking.openURL(target);
        } catch (error) {
            Alert.alert('Поддержка', 'Не удалось открыть Telegram.');
        }
    };

    const openTicketForm = () => {
        navigation.navigate('SupportTicketForm', {
            entryPoint: route.params?.entryPoint || 'portal',
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.title}>Поддержка VedaMatch</Text>
                <Text style={styles.subtitle}>
                    Техпроблемы, навигация по продукту и фидбек по улучшениям.
                </Text>

                <View style={styles.slaBox}>
                    <Text style={styles.slaTitle}>SLA</Text>
                    <Text style={styles.slaText}>{slaText}</Text>
                </View>

                {loading ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.loaderText}>Загружаем каналы поддержки…</Text>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity style={styles.primaryButton} onPress={openTelegram} activeOpacity={0.9}>
                            <Text style={styles.primaryButtonText}>Открыть Telegram поддержку</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, !inAppTicketAvailable && styles.secondaryButtonDisabled]}
                            onPress={openTicketForm}
                            activeOpacity={0.9}
                            disabled={!inAppTicketAvailable}
                        >
                            <Text style={styles.secondaryButtonText}>Создать обращение без Telegram</Text>
                        </TouchableOpacity>

                        {!inAppTicketAvailable && hasTelegramChannel ? (
                            <Text style={styles.rolloutHint}>
                                In-app тикеты включаются поэтапно. Сейчас доступен Telegram-канал.
                            </Text>
                        ) : null}

                        {isLoggedIn ? (
                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => navigation.navigate('SupportInbox')}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.linkButtonText}>Мои обращения</Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={() => loadConfig(true)}
                            disabled={refreshing}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.refreshText}>{refreshing ? 'Обновляем…' : 'Обновить'}</Text>
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
