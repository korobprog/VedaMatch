import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { yatraService } from '../../../services/yatraService';
import { Yatra } from '../../../types/yatra';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const YatraPublishScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const yatraId: number | undefined = route.params?.yatraId;

    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [consent, setConsent] = useState(false);
    const [yatra, setYatra] = useState<Yatra | null>(null);

    const loadYatra = useCallback(async () => {
        if (!yatraId) {
            Alert.alert('Ошибка', 'Тур не найден');
            navigation.goBack();
            return;
        }
        try {
            setLoading(true);
            const data = await yatraService.getYatra(yatraId);
            setYatra(data);
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить тур');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [navigation, yatraId]);

    useEffect(() => {
        void loadYatra();
    }, [loadYatra]);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const isOrganizer = !!yatra && !!user?.ID && (yatra.organizerId === user.ID || isAdmin);
    const isDraft = yatra?.status === 'draft';

    const handlePublish = async () => {
        if (!yatra || !isOrganizer) {
            Alert.alert('Недоступно', 'Публикация доступна только организатору.');
            return;
        }
        if (!isDraft) {
            Alert.alert('Недоступно', 'Этот тур уже опубликован.');
            return;
        }
        if (!consent) {
            Alert.alert('Требуется согласие', 'Подтвердите согласие на ежедневное списание LKM.');
            return;
        }
        try {
            setPublishing(true);
            await yatraService.publishYatra(yatra.id, { billingConsent: true });
            Alert.alert('Успех', 'Тур опубликован');
            navigation.replace('YatraDetail', { yatraId: yatra.id });
        } catch (error: any) {
            const code = error?.response?.data?.code;
            if (code === 'INSUFFICIENT_LKM') {
                Alert.alert('Недостаточно LKM', 'Для публикации не хватает активного LKM баланса.');
                return;
            }
            if (code === 'BILLING_CONSENT_REQUIRED') {
                Alert.alert('Требуется согласие', 'Подтвердите согласие на ежедневное списание LKM.');
                return;
            }
            Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось опубликовать тур');
        } finally {
            setPublishing(false);
        }
    };

    if (loading || !yatra) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Публикация Ятры</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.row}>
                    <ShieldCheck size={20} color={colors.success} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{yatra.title}</Text>
                </View>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    Ежедневная ставка: {yatra.dailyFeeLkm || 0} LKM
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    Статус: {yatra.status}
                </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Согласие на списание</Text>
                <Text style={[styles.text, { color: colors.textSecondary }]}>
                    При публикации будет выполнено первое списание. Далее списание происходит ежедневно, пока тур активен.
                </Text>
                <View style={styles.consentRow}>
                    <Switch
                        value={consent}
                        onValueChange={setConsent}
                        thumbColor={consent ? colors.success : colors.textSecondary}
                        trackColor={{ false: colors.border, true: colors.surface }}
                    />
                    <Text style={[styles.consentText, { color: colors.textPrimary }]}>
                        Подтверждаю ежедневное списание LKM за использование Ятры
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                style={[
                    styles.publishButton,
                    { backgroundColor: colors.success },
                    (!isOrganizer || !isDraft || publishing || !consent) && { opacity: 0.6 },
                ]}
                disabled={!isOrganizer || !isDraft || publishing || !consent}
                onPress={handlePublish}
            >
                {publishing ? (
                    <ActivityIndicator color={colors.background} />
                ) : (
                    <Text style={[styles.publishText, { color: colors.background }]}>Опубликовать тур</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: 16,
        },
        center: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
        },
        backButton: {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            flex: 1,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '700',
        },
        headerSpacer: {
            width: 38,
        },
        card: {
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        title: {
            fontSize: 17,
            fontWeight: '700',
            flex: 1,
        },
        meta: {
            marginTop: 8,
            fontSize: 13,
        },
        sectionTitle: {
            fontSize: 15,
            fontWeight: '700',
            marginBottom: 6,
        },
        text: {
            fontSize: 13,
            lineHeight: 18,
        },
        consentRow: {
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        consentText: {
            flex: 1,
            fontSize: 13,
            lineHeight: 18,
        },
        publishButton: {
            marginTop: 8,
            height: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        publishText: {
            fontSize: 15,
            fontWeight: '700',
        },
    });

export default YatraPublishScreen;
