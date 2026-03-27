import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, Image, FlatList, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Archive, MessageCircle, Pin, VolumeX, Plus, Search, X } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useChatInbox } from '../../../hooks/useChatInbox';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { getMediaUrl } from '../../../utils/url';
import { navigateToDirectChat } from '../../../utils/directChatNavigation';
import { resolveUserDisplayName } from '../../../utils/userDisplay';
import { messageService } from '../../../services/messageService';
import { friendRequestService } from '../../../services/friendRequestService';

type ChatInboxNavigation = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['all', 'unread', 'pinned', 'requests', 'archived'] as const;
const ListSeparator = () => <View style={styles.separator} />;

export const ChatInboxScreen: React.FC = () => {
    const navigation = useNavigation<ChatInboxNavigation>();
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'requests' | 'archived'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [processingRequestPeerIds, setProcessingRequestPeerIds] = useState<number[]>([]);
    const { items, loading, refreshing, loadingMore, hasMore, unreadCount, counts, refresh, loadMore, updateLocalConversation } = useChatInbox(filter, debouncedSearchQuery);
    const openSwipeableIdRef = useRef<number | null>(null);
    const swipeableRefs = useRef<Record<number, Swipeable | null>>({});
    const runAsyncAction = useCallback((task: Promise<unknown>) => {
        task.catch(() => {
            // Async UI actions can safely fail into existing refresh/state paths.
        });
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
        }, 250);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [searchQuery]);

    const copy = useMemo(() => {
        const lang = String(i18n.language || '').toLowerCase();
        if (lang.startsWith('hi')) {
            return {
                title: 'चैट',
                subtitle: 'आपके निजी संवाद',
                all: 'सभी',
                unread: 'अपठित',
                pinned: 'पिन',
                requests: 'रिक्वेस्ट',
                archived: 'आर्काइव',
                emptyTitle: 'कोई चैट नहीं',
                emptyBody: 'अपने संपर्कों में से किसी को लिखें और पहली बातचीत शुरू करें।',
                archivedEmptyTitle: 'आर्काइव खाली है',
                archivedEmptyBody: 'यहां वे संवाद दिखेंगे जिन्हें आपने archive किया है।',
                openContacts: 'संपर्क खोलें',
                searchPlaceholder: 'चैट खोजें',
                mute: 'म्यूट',
                unmute: 'अनम्यूट',
                pin: 'पिन',
                unpin: 'अनपिन',
                archive: 'आर्काइव',
                unarchive: 'वापस लाएं',
                archivedBadge: 'आर्काइव',
                pinnedBadge: 'पिन',
                mutedBadge: 'म्यूट',
                incomingRequestBadge: 'आपको रिक्वेस्ट',
                outgoingRequestBadge: 'भेजी गई रिक्वेस्ट',
                requestBadge: 'रिक्वेस्ट',
                requestsEmptyTitle: 'रिक्वेस्ट नहीं हैं',
                requestsEmptyBody: 'यहाँ वे निजी संवाद दिखेंगे, जहाँ उपयोगकर्ता अभी दोस्तों में नहीं है।',
                acceptRequest: 'स्वीकार करें',
                rejectRequest: 'अस्वीकार करें',
                cancelRequest: 'रद्द करें',
                sendRequest: 'दोस्त बनें',
            };
        }
        if (lang.startsWith('en')) {
            return {
                title: 'Chats',
                subtitle: 'Your direct conversations',
                all: 'All',
                unread: 'Unread',
                pinned: 'Pinned',
                requests: 'Requests',
                archived: 'Archived',
                emptyTitle: 'No conversations yet',
                emptyBody: 'Start a first chat from your contacts.',
                archivedEmptyTitle: 'Archive is empty',
                archivedEmptyBody: 'Archived conversations will appear here.',
                openContacts: 'Open contacts',
                searchPlaceholder: 'Search chats',
                mute: 'Mute',
                unmute: 'Unmute',
                pin: 'Pin',
                unpin: 'Unpin',
                archive: 'Archive',
                unarchive: 'Unarchive',
                archivedBadge: 'Archived',
                pinnedBadge: 'Pinned',
                mutedBadge: 'Muted',
                incomingRequestBadge: 'Incoming request',
                outgoingRequestBadge: 'Sent request',
                requestBadge: 'Request',
                requestsEmptyTitle: 'No requests yet',
                requestsEmptyBody: 'Direct conversations with users outside your friends list will appear here.',
                acceptRequest: 'Accept',
                rejectRequest: 'Decline',
                cancelRequest: 'Cancel',
                sendRequest: 'Add friend',
            };
        }
        return {
            title: 'Чаты',
            subtitle: 'Ваши личные диалоги',
            all: 'Все',
            unread: 'Непрочитанные',
            pinned: 'Закреплённые',
            requests: 'Запросы',
            archived: 'Архив',
            emptyTitle: 'Пока нет переписок',
            emptyBody: 'Начните первый диалог из контактов.',
            archivedEmptyTitle: 'Архив пуст',
            archivedEmptyBody: 'Здесь появятся диалоги, которые вы отправили в архив.',
            openContacts: 'Открыть контакты',
            searchPlaceholder: 'Поиск по чатам',
            mute: 'Заглушить',
            unmute: 'Включить',
            pin: 'Закрепить',
            unpin: 'Открепить',
            archive: 'В архив',
            unarchive: 'Из архива',
            archivedBadge: 'Архив',
            pinnedBadge: 'Закреплён',
            mutedBadge: 'Без звука',
            incomingRequestBadge: 'Входящий запрос',
            outgoingRequestBadge: 'Запрос отправлен',
            requestBadge: 'Запрос',
            requestsEmptyTitle: 'Запросов пока нет',
            requestsEmptyBody: 'Здесь появятся личные диалоги с пользователями, которые ещё не в друзьях.',
            acceptRequest: 'Принять',
            rejectRequest: 'Отклонить',
            cancelRequest: 'Отменить',
            sendRequest: 'В друзья',
        };
    }, [i18n.language]);

    const activeFilterLabel = {
        all: copy.all,
        unread: copy.unread,
        pinned: copy.pinned,
        requests: copy.requests,
        archived: copy.archived,
    };

    const filterBadges = useMemo(() => ({
        unread: counts.unread,
        requests: counts.requests,
    }), [counts.requests, counts.unread]);

    const inboxCopy = useMemo(() => {
        const lang = String(i18n.language || '').toLowerCase();
        if (lang.startsWith('hi')) {
            return { you: 'आप' };
        }
        if (lang.startsWith('en')) {
            return { you: 'You' };
        }
        return { you: 'Вы' };
    }, [i18n.language]);

    const themeStyles = useMemo(() => ({
        screenBackground: { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' },
        headerTitle: { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
        headerSubtitle: { color: isDarkMode ? 'rgba(248,250,252,0.72)' : '#64748B' },
        countPill: { borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' },
        countText: { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
        searchBar: {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
        },
        searchIcon: { color: isDarkMode ? '#94A3B8' : '#64748B' },
        searchInput: { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
        emptyTitle: { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
        emptyBody: { color: isDarkMode ? 'rgba(248,250,252,0.72)' : '#64748B' },
        activeFilterChip: { backgroundColor: colors.accent, borderColor: colors.accent },
        primaryButton: { backgroundColor: colors.accent },
    }), [colors.accent, isDarkMode]);

    const handlePreferenceToggle = useCallback(async (
        item: NonNullable<typeof items[number]>,
        key: 'muted' | 'pinned',
    ) => {
        const nextValue = !item[key];
        const updated = await messageService.updateChatPreference(item.peerUserId, { [key]: nextValue });
        await updateLocalConversation(item.peerUserId, {
            muted: updated.muted,
            pinned: updated.pinned,
            pinnedAt: updated.pinnedAt ?? null,
        });
    }, [updateLocalConversation]);

    const handleArchiveToggle = useCallback(async (item: NonNullable<typeof items[number]>) => {
        const nextArchived = !item.archived;
        const updated = await messageService.updateChatPreference(item.peerUserId, {
            archived: nextArchived,
        });
        await updateLocalConversation(item.peerUserId, {
            muted: updated.muted,
            pinned: updated.pinned,
            pinnedAt: updated.pinnedAt ?? null,
            archived: updated.archived,
            archivedAt: updated.archivedAt ?? null,
        });
    }, [updateLocalConversation]);

    const handleRequestAction = useCallback(async (
        item: NonNullable<typeof items[number]>,
        action: 'accept' | 'reject' | 'cancel' | 'send',
    ) => {
        if (processingRequestPeerIds.includes(item.peerUserId)) {
            return;
        }

        setProcessingRequestPeerIds((prev) => [...prev, item.peerUserId]);
        try {
            if (action === 'accept' && item.friendRequestId) {
                await friendRequestService.acceptRequest(item.friendRequestId);
                await updateLocalConversation(item.peerUserId, {
                    relationshipStatus: 'friend',
                    friendRequestId: undefined,
                });
                return;
            }
            if (action === 'reject' && item.friendRequestId) {
                await friendRequestService.rejectRequest(item.friendRequestId);
                await updateLocalConversation(item.peerUserId, {
                    relationshipStatus: 'none',
                    friendRequestId: undefined,
                });
                return;
            }
            if (action === 'cancel' && item.friendRequestId) {
                await friendRequestService.cancelRequest(item.friendRequestId);
                await updateLocalConversation(item.peerUserId, {
                    relationshipStatus: 'none',
                    friendRequestId: undefined,
                });
                return;
            }
            if (action === 'send') {
                const response = await friendRequestService.sendRequest(item.peerUserId);
                await updateLocalConversation(item.peerUserId, {
                    relationshipStatus: 'outgoing_request',
                    friendRequestId: response.id,
                });
            }
        } catch (error) {
            console.warn('[ChatInboxScreen] failed to process friend request action', error);
        } finally {
            setProcessingRequestPeerIds((prev) => prev.filter((peerUserId) => peerUserId !== item.peerUserId));
        }
    }, [processingRequestPeerIds, updateLocalConversation]);

    const renderSwipeActions = useCallback((item: NonNullable<typeof items[number]>) => {
        const archiveButtonStyle = [styles.swipeActionButton, styles.archiveAction, item.archived ? styles.swipeActionOff : styles.swipeActionArchive];
        const pinButtonStyle = [styles.swipeActionButton, styles.pinAction, item.pinned ? styles.swipeActionOff : { backgroundColor: colors.accent }];
        const muteButtonStyle = [styles.swipeActionButton, styles.muteAction, item.muted ? styles.swipeActionMutedOff : styles.swipeActionMute];

        return (
            <View style={styles.swipeActions}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={archiveButtonStyle}
                    onPress={() => {
                        swipeableRefs.current[item.peerUserId]?.close();
                        runAsyncAction(handleArchiveToggle(item));
                    }}
                >
                    <Archive size={14} color="#F8FAFC" />
                    <Text style={styles.swipeActionText}>{item.archived ? copy.unarchive : copy.archive}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={pinButtonStyle}
                    onPress={() => {
                        swipeableRefs.current[item.peerUserId]?.close();
                        runAsyncAction(handlePreferenceToggle(item, 'pinned'));
                    }}
                >
                    <Pin size={14} color="#F8FAFC" />
                    <Text style={styles.swipeActionText}>{item.pinned ? copy.unpin : copy.pin}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={muteButtonStyle}
                    onPress={() => {
                        swipeableRefs.current[item.peerUserId]?.close();
                        runAsyncAction(handlePreferenceToggle(item, 'muted'));
                    }}
                >
                    <VolumeX size={14} color="#F8FAFC" />
                    <Text style={styles.swipeActionText}>{item.muted ? copy.unmute : copy.mute}</Text>
                </TouchableOpacity>
            </View>
        );
    }, [colors.accent, copy.archive, copy.mute, copy.pin, copy.unarchive, copy.unmute, copy.unpin, handleArchiveToggle, handlePreferenceToggle, runAsyncAction]);

    const handleSwipeableWillOpen = useCallback((peerUserId: number) => {
        const openPeerUserId = openSwipeableIdRef.current;
        if (openPeerUserId != null && openPeerUserId !== peerUserId) {
            swipeableRefs.current[openPeerUserId]?.close();
        }
        openSwipeableIdRef.current = peerUserId;
    }, []);

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return items;
        }

        return items.filter((item) => {
            const peer = item.peerUser;
            const fallbackLabel = peer
                ? t('contacts.userFallback', { id: peer.ID, defaultValue: `User #${peer.ID}` }).replace(/\s*#\d+$/, '').trim() || 'User'
                : `User #${item.peerUserId}`;
            const displayName = peer
                ? resolveUserDisplayName(peer, { fallbackLabel })
                : item.peerUserPreview || fallbackLabel;

            return [
                displayName,
                item.peerUserPreview,
                item.lastMessage,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [items, searchQuery, t]);

    const renderItem = ({ item }: { item: NonNullable<typeof filteredItems[number]> }) => {
        const peer = item.peerUser;
        const fallbackLabel = peer
            ? t('contacts.userFallback', { id: peer.ID, defaultValue: `User #${peer.ID}` }).replace(/\s*#\d+$/, '').trim() || 'User'
            : `User #${item.peerUserId}`;
        const displayName = peer
            ? resolveUserDisplayName(peer, { fallbackLabel })
            : item.peerUserPreview || fallbackLabel;
        const avatarUrl = getMediaUrl(peer?.avatarUrl || '');
        const time = new Date(item.lastMessageAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
        const isOwnLastMessage = Boolean(user?.ID) && item.lastMessageSenderId === user?.ID;
        const previewText = item.lastMessage || copy.emptyBody;
        const statusMark = isOwnLastMessage ? (item.lastMessageSeen ? '✓✓' : '✓') : '';
        const relationshipBadge = item.relationshipStatus === 'incoming_request'
            ? copy.incomingRequestBadge
            : item.relationshipStatus === 'outgoing_request'
                ? copy.outgoingRequestBadge
                : item.relationshipStatus === 'none'
                    ? copy.requestBadge
                    : null;
        const cardStyle = [
            styles.card,
            isDarkMode ? styles.cardDark : styles.cardLight,
        ];
        const avatarFallbackStyle = [styles.avatarFallback, { backgroundColor: colors.accent }];
        const nameStyle = [styles.name, isDarkMode ? styles.textStrongDark : styles.textStrongLight];
        const trailingStatusStyle = [styles.trailingStatus, item.lastMessageSeen ? { color: colors.accent } : (isDarkMode ? styles.textMutedDark : styles.textMutedLight)];
        const timeStyle = [styles.time, isDarkMode ? styles.textSubtleDark : styles.textSubtleLight];
        const previewPrefixStyle = [styles.previewPrefix, item.lastMessageSeen ? { color: colors.accent } : (isDarkMode ? styles.textMutedDark : styles.textMutedLight)];
        const previewStyle = [styles.preview, isDarkMode ? styles.previewDark : styles.previewLight, item.unreadCount > 0 && styles.previewUnread];
        const pinnedBadgeStyle = [styles.badge, { backgroundColor: colors.accentSoft || 'rgba(255,255,255,0.08)' }];
        const pinnedBadgeTextStyle = [styles.badgeText, { color: colors.accent }];
        const mutedBadgeStyle = [styles.badge, isDarkMode ? styles.mutedBadgeDark : styles.mutedBadgeLight];
        const mutedBadgeTextStyle = [styles.badgeText, isDarkMode ? styles.mutedBadgeTextDark : styles.mutedBadgeTextLight];
        const archivedBadgeStyle = [styles.badge, isDarkMode ? styles.archivedBadgeDark : styles.archivedBadgeLight];
        const archivedBadgeTextStyle = [styles.badgeText, isDarkMode ? styles.archivedBadgeTextDark : styles.archivedBadgeTextLight];
        const requestBadgeStyle = [styles.badge, isDarkMode ? styles.requestBadgeDark : styles.requestBadgeLight];
        const requestBadgeTextStyle = [styles.badgeText, isDarkMode ? styles.requestBadgeTextDark : styles.requestBadgeTextLight];
        const isProcessingRequest = processingRequestPeerIds.includes(item.peerUserId);
        const contact = peer || {
            ID: item.peerUserId,
            karmicName: displayName,
            spiritualName: displayName,
            nickname: '',
            nicknameDisplay: '',
            avatarUrl: '',
            lastSeen: '',
            identity: '',
            city: '',
            country: '',
            email: '',
        };

        return (
            <Swipeable
                ref={(instance) => {
                    swipeableRefs.current[item.peerUserId] = instance;
                }}
                overshootRight={false}
                renderRightActions={() => renderSwipeActions(item)}
                onSwipeableWillOpen={() => handleSwipeableWillOpen(item.peerUserId)}
                onSwipeableClose={() => {
                    if (openSwipeableIdRef.current === item.peerUserId) {
                        openSwipeableIdRef.current = null;
                    }
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => navigateToDirectChat(navigation, contact)}
                    style={cardStyle}
                >
                    <View style={styles.avatarWrap}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={avatarFallbackStyle}>
                                <Text style={styles.avatarLetter}>{(displayName || 'U')[0]}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.body}>
                        <View style={styles.topRow}>
                            <Text style={nameStyle} numberOfLines={1}>
                                {displayName}
                            </Text>
                            <View style={styles.trailingMeta}>
                                {isOwnLastMessage ? (
                                    <Text style={trailingStatusStyle}>
                                        {statusMark}
                                    </Text>
                                ) : null}
                                <Text style={timeStyle}>
                                    {time}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.previewRow}>
                            {isOwnLastMessage ? (
                                <Text style={previewPrefixStyle}>
                                    {item.lastMessageSeen ? '✓✓' : '✓'} {inboxCopy.you}:
                                </Text>
                            ) : null}
                            <Text
                                style={previewStyle}
                                numberOfLines={2}
                            >
                                {previewText}
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            {item.pinned ? (
                                <View style={pinnedBadgeStyle}>
                                    <Pin size={12} color={colors.accent} />
                                    <Text style={pinnedBadgeTextStyle}>{copy.pinnedBadge}</Text>
                                </View>
                            ) : null}
                            {item.muted ? (
                                <View style={mutedBadgeStyle}>
                                    <VolumeX size={12} color={isDarkMode ? '#CBD5E1' : '#64748B'} />
                                    <Text style={mutedBadgeTextStyle}>{copy.mutedBadge}</Text>
                                </View>
                            ) : null}
                            {item.archived ? (
                                <View style={archivedBadgeStyle}>
                                    <Archive size={12} color={isDarkMode ? '#C4B5FD' : '#7C3AED'} />
                                    <Text style={archivedBadgeTextStyle}>{copy.archivedBadge}</Text>
                                </View>
                            ) : null}
                            {relationshipBadge ? (
                                <View style={requestBadgeStyle}>
                                    <Text style={requestBadgeTextStyle}>{relationshipBadge}</Text>
                                </View>
                            ) : null}
                            {item.unreadCount > 0 ? (
                                <View style={[styles.unreadPill, { backgroundColor: colors.accent }]}>
                                    <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                                </View>
                            ) : null}
                        </View>
                        {filter === 'requests' ? (
                            <View style={styles.requestActionsRow}>
                                {item.relationshipStatus === 'incoming_request' ? (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            style={[styles.requestActionButton, styles.requestActionPrimary, { backgroundColor: colors.accent }]}
                                            onPress={() => {
                                                runAsyncAction(handleRequestAction(item, 'accept'));
                                            }}
                                            disabled={isProcessingRequest}
                                        >
                                            {isProcessingRequest ? (
                                                <ActivityIndicator size="small" color="#0F172A" />
                                            ) : (
                                                <Text style={styles.requestActionPrimaryText}>{copy.acceptRequest}</Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            style={[styles.requestActionButton, isDarkMode ? styles.requestActionSecondaryDark : styles.requestActionSecondaryLight]}
                                            onPress={() => {
                                                runAsyncAction(handleRequestAction(item, 'reject'));
                                            }}
                                            disabled={isProcessingRequest}
                                        >
                                            <Text style={[styles.requestActionSecondaryText, isDarkMode ? styles.requestActionSecondaryTextDark : styles.requestActionSecondaryTextLight]}>
                                                {copy.rejectRequest}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                ) : null}
                                {item.relationshipStatus === 'outgoing_request' ? (
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        style={[styles.requestActionButton, isDarkMode ? styles.requestActionSecondaryDark : styles.requestActionSecondaryLight]}
                                        onPress={() => {
                                            runAsyncAction(handleRequestAction(item, 'cancel'));
                                        }}
                                        disabled={isProcessingRequest}
                                    >
                                        {isProcessingRequest ? (
                                            <ActivityIndicator size="small" color={isDarkMode ? '#E2E8F0' : '#334155'} />
                                        ) : (
                                            <Text style={[styles.requestActionSecondaryText, isDarkMode ? styles.requestActionSecondaryTextDark : styles.requestActionSecondaryTextLight]}>
                                                {copy.cancelRequest}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ) : null}
                                {item.relationshipStatus === 'none' ? (
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        style={[styles.requestActionButton, styles.requestActionPrimary, { backgroundColor: colors.accent }]}
                                        onPress={() => {
                                            runAsyncAction(handleRequestAction(item, 'send'));
                                        }}
                                        disabled={isProcessingRequest}
                                    >
                                        {isProcessingRequest ? (
                                            <ActivityIndicator size="small" color="#0F172A" />
                                        ) : (
                                            <Text style={styles.requestActionPrimaryText}>{copy.sendRequest}</Text>
                                        )}
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                    <MessageCircle size={18} color={isDarkMode ? '#94A3B8' : '#94A3B8'} />
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderFooter = useCallback(() => {
        if (!loadingMore) {
            return <View style={styles.listFooterSpacer} />;
        }

        return (
            <View style={styles.listFooter}>
                <ActivityIndicator size="small" color={colors.accent} />
            </View>
        );
    }, [colors.accent, loadingMore]);

    return (
        <SafeAreaView style={[styles.safeArea, themeStyles.screenBackground]}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerCopy}>
                        <Text style={[styles.title, themeStyles.headerTitle]}>{copy.title}</Text>
                        <Text style={[styles.subtitle, themeStyles.headerSubtitle]}>{copy.subtitle}</Text>
                    </View>
                    <View style={[styles.countPill, themeStyles.countPill]}>
                        <Text style={[styles.countText, themeStyles.countText]}>{unreadCount}</Text>
                    </View>
                </View>

                <View style={styles.filters}>
                    {FILTERS.map((key) => {
                        const active = filter === key;
                        return (
                            <TouchableOpacity
                                key={key}
                                onPress={() => setFilter(key)}
                                style={[
                                    styles.filterChip,
                                    active && themeStyles.activeFilterChip,
                                ]}
                            >
                                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                                    {activeFilterLabel[key]}
                                </Text>
                                {((key === 'unread' || key === 'requests') && (filterBadges[key] || 0) > 0) ? (
                                    <View style={[styles.filterCountBadge, active ? styles.filterCountBadgeActive : styles.filterCountBadgeIdle]}>
                                        <Text style={[styles.filterCountBadgeText, active ? styles.filterCountBadgeTextActive : styles.filterCountBadgeTextIdle]}>
                                            {filterBadges[key] > 99 ? '99+' : filterBadges[key]}
                                        </Text>
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={[styles.searchBar, themeStyles.searchBar]}>
                    <Search size={16} color={themeStyles.searchIcon.color} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={copy.searchPlaceholder}
                        placeholderTextColor={isDarkMode ? '#94A3B8' : '#94A3B8'}
                        style={[styles.searchInput, themeStyles.searchInput]}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={16} color={themeStyles.searchIcon.color} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                ) : filteredItems.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={[styles.emptyTitle, themeStyles.emptyTitle]}>
                            {filter === 'requests' && !searchQuery ? copy.requestsEmptyTitle : (filter === 'archived' && !searchQuery ? copy.archivedEmptyTitle : copy.emptyTitle)}
                        </Text>
                        <Text style={[styles.emptyBody, themeStyles.emptyBody]}>
                            {searchQuery ? copy.searchPlaceholder : (filter === 'requests' ? copy.requestsEmptyBody : (filter === 'archived' ? copy.archivedEmptyBody : copy.emptyBody))}
                        </Text>
                        {!searchQuery && filter !== 'archived' && filter !== 'requests' ? (
                            <TouchableOpacity
                                style={[styles.primaryButton, themeStyles.primaryButton]}
                                onPress={() => navigation.navigate('Portal', { initialTab: 'contacts' })}
                            >
                                <Plus size={16} color="#0F172A" />
                                <Text style={styles.primaryButtonText}>{copy.openContacts}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : (
                    <FlatList
                        data={filteredItems}
                        keyExtractor={(item) => String(item.peerUserId)}
                        renderItem={renderItem}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={ListSeparator}
                        onEndReachedThreshold={0.35}
                        onEndReached={() => {
                            if (hasMore) {
                                runAsyncAction(loadMore());
                            }
                        }}
                        ListFooterComponent={renderFooter}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
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
        marginBottom: 16,
    },
    headerCopy: {
        flex: 1,
        paddingRight: 12,
    },
    title: {
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 18,
    },
    countPill: {
        minWidth: 44,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    countText: {
        fontSize: 15,
        fontWeight: '800',
    },
    filters: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    searchBar: {
        minHeight: 46,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 10,
    },
    filterChip: {
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    filterTextActive: {
        color: '#0F172A',
    },
    filterCountBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterCountBadgeActive: {
        backgroundColor: 'rgba(15,23,42,0.16)',
    },
    filterCountBadgeIdle: {
        backgroundColor: '#E2E8F0',
    },
    filterCountBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    filterCountBadgeTextActive: {
        color: '#0F172A',
    },
    filterCountBadgeTextIdle: {
        color: '#334155',
    },
    listContent: {
        paddingBottom: 32,
    },
    listFooter: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listFooterSpacer: {
        height: 4,
    },
    separator: {
        height: 12,
    },
    swipeActions: {
        width: 262,
        height: '100%',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        paddingLeft: 8,
    },
    swipeActionButton: {
        width: 82,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 10,
    },
    swipeActionOff: {
        backgroundColor: '#475569',
    },
    swipeActionArchive: {
        backgroundColor: '#7C3AED',
    },
    swipeActionMutedOff: {
        backgroundColor: '#334155',
    },
    swipeActionMute: {
        backgroundColor: '#0F766E',
    },
    pinAction: {
        backgroundColor: '#2563EB',
    },
    archiveAction: {
        backgroundColor: '#7C3AED',
    },
    muteAction: {
        backgroundColor: '#0F766E',
    },
    swipeActionText: {
        color: '#F8FAFC',
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 1,
        padding: 14,
        gap: 12,
    },
    cardDark: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
    },
    avatarWrap: {
        width: 54,
        height: 54,
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 18,
    },
    avatarFallback: {
        width: 54,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        color: '#0F172A',
        fontWeight: '900',
        fontSize: 18,
    },
    body: {
        flex: 1,
        minWidth: 0,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    trailingMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
    },
    trailingStatus: {
        fontSize: 11,
        fontWeight: '800',
        minWidth: 18,
        textAlign: 'right',
    },
    time: {
        fontSize: 12,
        fontWeight: '600',
    },
    previewRow: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    previewPrefix: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '700',
    },
    preview: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    previewUnread: {
        fontWeight: '700',
    },
    textStrongDark: {
        color: '#F8FAFC',
    },
    textStrongLight: {
        color: '#0F172A',
    },
    textMutedDark: {
        color: '#94A3B8',
    },
    textMutedLight: {
        color: '#64748B',
    },
    textSubtleDark: {
        color: 'rgba(248,250,252,0.72)',
    },
    textSubtleLight: {
        color: '#64748B',
    },
    previewDark: {
        color: 'rgba(248,250,252,0.78)',
    },
    previewLight: {
        color: '#475569',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    mutedBadgeDark: {
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    mutedBadgeLight: {
        backgroundColor: '#F1F5F9',
    },
    mutedBadgeTextDark: {
        color: '#CBD5E1',
    },
    mutedBadgeTextLight: {
        color: '#64748B',
    },
    archivedBadgeDark: {
        backgroundColor: 'rgba(124,58,237,0.18)',
    },
    archivedBadgeLight: {
        backgroundColor: '#EDE9FE',
    },
    archivedBadgeTextDark: {
        color: '#C4B5FD',
    },
    archivedBadgeTextLight: {
        color: '#7C3AED',
    },
    requestBadgeDark: {
        backgroundColor: 'rgba(251, 191, 36, 0.18)',
    },
    requestBadgeLight: {
        backgroundColor: '#FEF3C7',
    },
    requestBadgeTextDark: {
        color: '#FDE68A',
    },
    requestBadgeTextLight: {
        color: '#92400E',
    },
    requestActionsRow: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    requestActionButton: {
        minHeight: 34,
        borderRadius: 17,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestActionPrimary: {
        minWidth: 108,
    },
    requestActionPrimaryText: {
        color: '#0F172A',
        fontSize: 12,
        fontWeight: '800',
    },
    requestActionSecondaryDark: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    requestActionSecondaryLight: {
        backgroundColor: '#E2E8F0',
    },
    requestActionSecondaryText: {
        fontSize: 12,
        fontWeight: '700',
    },
    requestActionSecondaryTextDark: {
        color: '#E2E8F0',
    },
    requestActionSecondaryTextLight: {
        color: '#334155',
    },
    unreadPill: {
        marginLeft: 'auto',
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 7,
    },
    unreadText: {
        color: '#0F172A',
        fontSize: 11,
        fontWeight: '900',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
    },
    emptyBody: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 320,
    },
    primaryButton: {
        marginTop: 16,
        minHeight: 44,
        borderRadius: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '800',
    },
});
