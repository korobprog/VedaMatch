import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { datingService } from '../../../services/datingService';

type Props = NativeStackScreenProps<RootStackParamList, 'UnionApprovals'>;

type ApprovalItem = {
    id?: number;
    ID?: number;
    userId?: number;
    UserID?: number;
    status?: string;
    Status?: string;
    note?: string;
    Note?: string;
    user?: {
        id?: number;
        ID?: number;
        spiritualName?: string;
        spiritual_name?: string;
        karmicName?: string;
        karmic_name?: string;
        city?: string;
    };
    User?: {
        id?: number;
        ID?: number;
        spiritualName?: string;
        spiritual_name?: string;
        karmicName?: string;
        karmic_name?: string;
        city?: string;
    };
};

export const UnionApprovalRequestsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [respondingId, setRespondingId] = useState<number | null>(null);
    const [items, setItems] = useState<ApprovalItem[]>([]);
    const [highlightedApprovalId, setHighlightedApprovalId] = useState<number | null>(
        route.params?.focusApprovalId ?? null
    );

    const loadRequests = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (mode === 'refresh') {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const response = await datingService.getIncomingApprovalRequests();
            const nextItems = Array.isArray(response) ? response : [];
            const focusApprovalId = route.params?.focusApprovalId;
            if (focusApprovalId) {
                const focused = nextItems.find((item) => Number(item.id || item.ID) === focusApprovalId);
                const rest = nextItems.filter((item) => Number(item.id || item.ID) !== focusApprovalId);
                setItems(focused ? [focused, ...rest] : nextItems);
                setHighlightedApprovalId(focused ? focusApprovalId : null);
            } else {
                setItems(nextItems);
            }
        } catch (error) {
            console.error('Failed to load Union approvals:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [route.params?.focusApprovalId]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    useEffect(() => {
        if (!highlightedApprovalId) {
            return;
        }
        const timeout = setTimeout(() => setHighlightedApprovalId(null), 2500);
        return () => clearTimeout(timeout);
    }, [highlightedApprovalId]);

    const respond = async (item: ApprovalItem, status: 'approved' | 'rejected') => {
        const approvalId = Number(item.id || item.ID);
        const requesterId = Number(item.userId || item.UserID);
        if (!approvalId || !requesterId) {
            return;
        }
        setRespondingId(approvalId);
        try {
            await datingService.respondApproval(requesterId, approvalId, status);
            await loadRequests('refresh');
            Alert.alert(t('common.success'), t('dating.approvalRespondSuccess'));
        } catch (error) {
            console.error('Failed to respond to approval request:', error);
            Alert.alert(t('common.error'), t('dating.approvalRespondError'));
        } finally {
            setRespondingId(null);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centered}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.headerAction}>{t('common.close')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('dating.incomingApprovalsTitle')}</Text>
                <View style={styles.headerSpacer} />
            </View>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRequests('refresh')} tintColor={colors.accent} />}
            >
                <Text style={styles.hint}>{t('dating.incomingApprovalsHint')}</Text>
                {items.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>{t('dating.incomingApprovalsEmpty')}</Text>
                    </View>
                ) : (
                    items.map((item) => {
                        const approvalId = Number(item.id || item.ID);
                        const profile = item.user || item.User || {};
                        const status = String(item.status || item.Status || 'pending');
                        const displayName = profile.spiritualName || profile.spiritual_name || profile.karmicName || profile.karmic_name || `User ${item.userId || item.UserID}`;
                        return (
                            <View
                                key={approvalId}
                                style={[
                                    styles.card,
                                    highlightedApprovalId === approvalId && styles.cardHighlighted,
                                ]}
                            >
                                <Text style={styles.cardTitle}>{displayName}</Text>
                                {!!profile.city && <Text style={styles.cardMeta}>{profile.city}</Text>}
                                <Text style={styles.cardStatus}>{t(`dating.approvalStatus.${status}`)}</Text>
                                {!!(item.note || item.Note) && <Text style={styles.cardMeta}>{String(item.note || item.Note)}</Text>}
                                {status === 'pending' && (
                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.approveBtn]}
                                            onPress={() => respond(item, 'approved')}
                                            disabled={respondingId === approvalId}
                                        >
                                            {respondingId === approvalId ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionText}>{t('dating.approvalApprove')}</Text>}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.rejectBtn]}
                                            onPress={() => respond(item, 'rejected')}
                                            disabled={respondingId === approvalId}
                                        >
                                            <Text style={styles.actionText}>{t('dating.approvalReject')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
}) => StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerAction: {
        color: colors.accent,
        fontSize: 16,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '700',
    },
    headerSpacer: {
        width: 48,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    hint: {
        color: colors.textSecondary,
        marginBottom: 14,
        lineHeight: 20,
    },
    emptyCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 18,
        backgroundColor: colors.surfaceElevated,
    },
    emptyText: {
        color: colors.textSecondary,
    },
    card: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
        backgroundColor: colors.surfaceElevated,
        marginBottom: 12,
    },
    cardHighlighted: {
        borderColor: colors.accent,
        shadowColor: colors.accent,
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardMeta: {
        color: colors.textSecondary,
        marginTop: 4,
    },
    cardStatus: {
        color: colors.accent,
        fontWeight: '600',
        marginTop: 8,
    },
    actionsRow: {
        flexDirection: 'row',
        marginTop: 14,
    },
    actionBtn: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approveBtn: {
        backgroundColor: colors.accent,
        marginRight: 10,
    },
    rejectBtn: {
        backgroundColor: '#B6465F',
    },
    actionText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
