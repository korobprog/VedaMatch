import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { supportService, SupportConversation } from '../../services/supportService';
import { useUser } from '../../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportInbox'>;

const formatDate = (raw?: string) => {
    if (!raw) {
        return '';
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const SupportInboxScreen: React.FC<Props> = ({ navigation }) => {
    const { isLoggedIn } = useUser();
    const [tickets, setTickets] = useState<SupportConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (silent: boolean) => {
        if (!silent) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const response = await supportService.listMyTickets(1, 50);
            setTickets(response?.tickets || []);
        } catch (error) {
            console.warn('[SupportInbox] failed to load tickets:', error);
            setTickets([]);
        } finally {
            if (!silent) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load(false);
        }, [load])
    );

    if (!isLoggedIn) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.blockedTitle}>Войдите в аккаунт</Text>
                    <Text style={styles.blockedSubtitle}>
                        История обращений доступна только авторизованным пользователям.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.primaryButtonText}>Открыть вход</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Мои обращения</Text>
                    <TouchableOpacity
                        style={styles.newButton}
                        onPress={() => navigation.navigate('SupportTicketForm', { entryPoint: 'inbox' })}
                    >
                        <Text style={styles.newButtonText}>Новое</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="small" color="#2563EB" />
                    </View>
                ) : (
                    <FlatList
                        data={tickets}
                        keyExtractor={(item) => String(item.ID)}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                        ListEmptyComponent={
                            <View style={styles.emptyWrap}>
                                <Text style={styles.emptyTitle}>Пока нет обращений</Text>
                                <Text style={styles.emptySubtitle}>Создайте первое обращение, если нужна помощь.</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const unread = item.unreadCount || 0;
                            return (
                                <TouchableOpacity
                                    style={styles.ticketCard}
                                    onPress={() => navigation.navigate('SupportConversation', { conversationId: item.ID })}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.ticketTop}>
                                        <Text style={styles.ticketNumber}>{item.ticketNumber || `#${item.ID}`}</Text>
                                        <View style={styles.ticketTopRight}>
                                            <Text style={[styles.statusBadge, item.status === 'resolved' ? styles.statusResolved : styles.statusOpen]}>
                                                {item.status === 'resolved' ? 'resolved' : 'open'}
                                            </Text>
                                            <Text style={styles.channelBadge}>{item.channel || 'in_app'}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.ticketSubject} numberOfLines={1}>
                                        {item.subject || 'Support request'}
                                    </Text>
                                    <Text style={styles.ticketPreview} numberOfLines={2}>
                                        {item.lastMessagePreview || 'Без текста'}
                                    </Text>
                                    <View style={styles.ticketBottom}>
                                        <Text style={styles.ticketTime}>{formatDate(item.lastMessageAt || item.UpdatedAt)}</Text>
                                        {unread > 0 ? (
                                            <View style={styles.unreadBadge}>
                                                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
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
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    title: {
        fontSize: 23,
        fontWeight: '800',
        color: '#0F172A',
    },
    newButton: {
        backgroundColor: '#2563EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    newButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    blockedTitle: {
        color: '#0F172A',
        fontSize: 22,
        fontWeight: '800',
    },
    blockedSubtitle: {
        marginTop: 8,
        color: '#475569',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    primaryButton: {
        marginTop: 16,
        backgroundColor: '#2563EB',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    emptyWrap: {
        marginTop: 80,
        alignItems: 'center',
    },
    emptyTitle: {
        color: '#0F172A',
        fontWeight: '800',
        fontSize: 18,
    },
    emptySubtitle: {
        marginTop: 6,
        color: '#64748B',
        fontSize: 14,
    },
    ticketCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        padding: 12,
        marginBottom: 10,
    },
    ticketTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ticketTopRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ticketNumber: {
        color: '#0F172A',
        fontWeight: '800',
        fontSize: 13,
    },
    statusBadge: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statusOpen: {
        color: '#1D4ED8',
    },
    statusResolved: {
        color: '#16A34A',
    },
    channelBadge: {
        color: '#334155',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'lowercase',
    },
    ticketSubject: {
        marginTop: 6,
        color: '#0F172A',
        fontSize: 15,
        fontWeight: '700',
    },
    ticketPreview: {
        marginTop: 4,
        color: '#334155',
        fontSize: 13,
        lineHeight: 18,
    },
    ticketBottom: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ticketTime: {
        color: '#64748B',
        fontSize: 12,
    },
    unreadBadge: {
        backgroundColor: '#EF4444',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
});

export default SupportInboxScreen;
