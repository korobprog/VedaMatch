import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import FastImage from 'react-native-fast-image';
import { Check, X, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../../../components/chat/ChatConstants';
import { friendRequestService, FriendRequest } from '../../../services/friendRequestService';
import { invalidateContactsCaches } from '../../../lib/contactCache';
import { getMediaUrl } from '../../../utils/url';

export const FriendRequestsScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const theme = COLORS.dark;

    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);
            const data = await friendRequestService.getIncomingRequests();
            setRequests(data);
        } catch (error) {
            console.error('[FriendRequestsScreen] Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadRequests();
        }, [loadRequests])
    );

    const handleAccept = useCallback(async (requestId: number, _senderId: number) => {
        if (processingIds.has(requestId)) return;

        setProcessingIds(prev => new Set(prev).add(requestId));
        try {
            await friendRequestService.acceptRequest(requestId);
            await invalidateContactsCaches(queryClient);
            // Remove from list
            setRequests(prev => prev.filter(req => req.id !== requestId));
        } catch (error) {
            console.error('[FriendRequestsScreen] Error accepting request:', error);
            alert(t('friendRequests.acceptError') || 'Не удалось принять запрос');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    }, [processingIds, queryClient, t]);

    const handleReject = useCallback(async (requestId: number) => {
        if (processingIds.has(requestId)) return;

        setProcessingIds(prev => new Set(prev).add(requestId));
        try {
            await friendRequestService.rejectRequest(requestId);
            await invalidateContactsCaches(queryClient);
            // Remove from list
            setRequests(prev => prev.filter(req => req.id !== requestId));
        } catch (error) {
            console.error('[FriendRequestsScreen] Error rejecting request:', error);
            alert(t('friendRequests.rejectError') || 'Не удалось отклонить запрос');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    }, [processingIds, queryClient, t]);

    const openProfile = useCallback((senderId: number) => {
        navigation.navigate('ContactProfile', { userId: senderId });
    }, [navigation]);

    const renderRequest = useCallback(({ item }: { item: FriendRequest }) => {
        const avatarUrl = getMediaUrl(item.avatarUrl);
        const isProcessing = processingIds.has(item.id);

        return (
            <View style={[styles.requestItem, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={() => openProfile(item.senderId)}
                    disabled={isProcessing}
                >
                    {avatarUrl ? (
                        <FastImage
                            source={{
                                uri: avatarUrl,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.accent }]}>
                            <Text style={styles.avatarLetter}>
                                {item.senderName?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.infoContainer}>
                    <Text style={[styles.senderName, { color: theme.text }]} numberOfLines={1}>
                        {item.senderName || t('common.unknown')}
                    </Text>
                    <Text style={[styles.location, { color: theme.subText }]} numberOfLines={1}>
                        {item.city && item.country ? `${item.city}, ${item.country}` : item.city || item.country || ''}
                    </Text>
                    <Text style={[styles.date, { color: theme.subText }]}>
                        {new Date(item.createdAt).toLocaleDateString(i18n.language || 'ru', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                        onPress={() => handleAccept(item.id, item.senderId)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Check size={20} color="#fff" strokeWidth={3} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                        onPress={() => handleReject(item.id)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <X size={20} color="#fff" strokeWidth={3} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, [processingIds, theme, i18n.language, t, openProfile, handleAccept, handleReject]);

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.subText }]}>
                {t('friendRequests.empty') || 'Нет входящих запросов'}
            </Text>
        </View>
    ), [theme, t]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {t('friendRequests.title') || 'Запросы в друзья'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequest}
                    keyExtractor={(item) => item.id.toString()}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    placeholder: {
        width: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        flexGrow: 1,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginLeft: 70,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
    },
    senderName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    location: {
        fontSize: 13,
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
