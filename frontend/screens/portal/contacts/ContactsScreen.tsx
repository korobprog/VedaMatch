import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal, ScrollView, Platform, FlatList } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../../utils/url';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../components/chat/ChatConstants';
import {
    contactService,
    PaginatedContactsResponse,
    UserContact,
} from '../../../services/contactService';
import { useUser } from '../../../context/UserContext';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { ScreenScaffold } from '../../../components/theme/ScreenScaffold';

import { useChat } from '../../../context/ChatContext';
import { useSettings } from '../../../context/SettingsContext';
import { Phone, MessageCircle, Search, X, ChevronDown, ChevronRight, Check, ArrowLeft } from 'lucide-react-native';
import apiClient from '../../../lib/apiClient';
import {
    buildContactsSnapshotInitialData,
    CONTACTS_AVATAR_PRELOAD_LIMIT,
    CONTACTS_BASE_QUERY_KEYS,
    CONTACTS_CACHE_GC_TIME_MS,
    CONTACTS_CACHE_STALE_TIME_MS,
    CONTACTS_CITIES_CACHE_TIME_MS,
    invalidateContactsCaches,
    readContactsSnapshot,
    writeContactsSnapshot,
} from '../../../lib/contactCache';
import { FlashList, shouldUseFlashList } from '../../../lib/flashListCompat';
import { resolveEffectivePerformanceMode } from '../../../utils/androidVisualPolicy';
import { resolveUserDisplayInitial, resolveUserDisplayName, resolveUserNicknameLabel } from '../../../utils/userDisplay';
import { friendRequestService } from '../../../services/friendRequestService';

const CONTACTS_PAGE_LIMIT = 50;
const CONTACT_ITEM_HEIGHT = 92;

const mergeContactsPages = (pages?: PaginatedContactsResponse[]): UserContact[] => {
    if (!pages || pages.length === 0) {
        return [];
    }

    const map = new Map<number, UserContact>();
    for (const page of pages) {
        for (const item of page.items || []) {
            map.set(item.ID, item);
        }
    }

    return Array.from(map.values());
};

export const ContactsScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const { setChatRecipient } = useChat();
    const { vTheme, isDarkMode, portalBackgroundType, performanceMode, runtimePerformanceState } = useSettings();
    const effectivePerformanceMode = useMemo(
        () => resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
    const isPhotoBg = portalBackgroundType === 'image' && isDarkMode;
    const usePhotoBg = isPhotoBg && !isAndroidReducedEffects;
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const { user: currentUser } = useUser();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [filter, setFilter] = useState<'all' | 'requests' | 'friends' | 'blocked'>('all');
    const [friendRequestCount, setFriendRequestCount] = useState(0);
    const [showFriendRequests, setShowFriendRequests] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);

    // City Filter State - support multiple cities
    const [filterCities, setFilterCities] = useState<string[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const unblockingIdsRef = useRef<Set<number>>(new Set());
    const allContactsRef = useRef<UserContact[]>([]);
    const preloadedAvatarUrlsRef = useRef<Set<string>>(new Set());
    const navigationLockRef = useRef(false);
    const navigationUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const allSnapshot = useMemo(() => readContactsSnapshot('all'), []);
    const friendsSnapshot = useMemo(() => readContactsSnapshot('friends'), []);
    const blockedSnapshot = useMemo(() => readContactsSnapshot('blocked'), []);

    useEffect(() => {
        const entries = [
            [CONTACTS_BASE_QUERY_KEYS.all, allSnapshot],
            [CONTACTS_BASE_QUERY_KEYS.friends, friendsSnapshot],
            [CONTACTS_BASE_QUERY_KEYS.blocked, blockedSnapshot],
        ] as const;

        for (const [queryKey, snapshot] of entries) {
            if (!snapshot || queryClient.getQueryData(queryKey)) {
                continue;
            }

            queryClient.setQueryData(queryKey, buildContactsSnapshotInitialData(snapshot));
        }
    }, [allSnapshot, blockedSnapshot, friendsSnapshot, queryClient]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const reqs = await friendRequestService.getIncomingRequests();
                setRequests(reqs);
                setFriendRequestCount(reqs.length);
            } catch (error) {
                console.error('[ContactsScreen] Error loading friend requests:', error);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        return () => {
            if (navigationUnlockTimerRef.current) {
                clearTimeout(navigationUnlockTimerRef.current);
            }
        };
    }, []);

    const releaseNavigationLock = useCallback(() => {
        navigationLockRef.current = false;
        if (navigationUnlockTimerRef.current) {
            clearTimeout(navigationUnlockTimerRef.current);
            navigationUnlockTimerRef.current = null;
        }
    }, []);

    const runWithNavigationLock = useCallback((action: () => void) => {
        if (navigationLockRef.current) {
            return;
        }
        navigationLockRef.current = true;
        action();
        navigationUnlockTimerRef.current = setTimeout(() => {
            releaseNavigationLock();
        }, 350);
    }, [releaseNavigationLock]);

    const openChat = useCallback((contact: UserContact) => {
        runWithNavigationLock(() => {
            const fallbackLabel = t('contacts.userFallback', { id: contact.ID, defaultValue: `User #${contact.ID}` }).replace(/\s*#\d+$/, '').trim() || 'User';
            setChatRecipient(contact);
            requestAnimationFrame(() => {
                navigation.navigate('Chat', {
                    userId: contact.ID,
                    name: resolveUserDisplayName(contact, { fallbackLabel }) || undefined,
                });
            });
        });
    }, [navigation, runWithNavigationLock, setChatRecipient, t]);

    const openCall = useCallback((contact: UserContact) => {
        runWithNavigationLock(() => {
            const fallbackLabel = t('contacts.userFallback', { id: contact.ID, defaultValue: `User #${contact.ID}` }).replace(/\s*#\d+$/, '').trim() || 'User';
            navigation.navigate('CallScreen', {
                targetId: contact.ID,
                isIncoming: false,
                callerName: resolveUserDisplayName(contact, { fallbackLabel }) || fallbackLabel,
            });
        });
    }, [navigation, runWithNavigationLock, t]);

    const allContactsQuery = useInfiniteQuery({
        queryKey: ['contacts', 'all', debouncedSearch, filterCities.join(',')],
        initialPageParam: undefined as number | undefined,
        enabled: filter === 'all',
        initialData: !debouncedSearch && filterCities.length === 0
            ? buildContactsSnapshotInitialData(allSnapshot)
            : undefined,
        initialDataUpdatedAt: !debouncedSearch && filterCities.length === 0
            ? allSnapshot?.updatedAt
            : undefined,
        staleTime: CONTACTS_CACHE_STALE_TIME_MS,
        gcTime: CONTACTS_CACHE_GC_TIME_MS,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        queryFn: ({ pageParam }) =>
            contactService.getContactsPage({
                limit: CONTACTS_PAGE_LIMIT,
                cursor: typeof pageParam === 'number' ? pageParam : undefined,
                tab: 'all',
                q: debouncedSearch || undefined,
                cities: filterCities.length > 0 ? filterCities : undefined,
            }),
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    });

    const friendsContactsQuery = useInfiniteQuery({
        queryKey: ['contacts', 'friends', debouncedSearch],
        initialPageParam: undefined as number | undefined,
        enabled: filter === 'friends',
        initialData: !debouncedSearch
            ? buildContactsSnapshotInitialData(friendsSnapshot)
            : undefined,
        initialDataUpdatedAt: !debouncedSearch
            ? friendsSnapshot?.updatedAt
            : undefined,
        staleTime: CONTACTS_CACHE_STALE_TIME_MS,
        gcTime: CONTACTS_CACHE_GC_TIME_MS,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        queryFn: ({ pageParam }) =>
            contactService.getContactsPage({
                limit: CONTACTS_PAGE_LIMIT,
                cursor: typeof pageParam === 'number' ? pageParam : undefined,
                tab: 'friends',
                q: debouncedSearch || undefined,
            }),
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    });

    const blockedContactsQuery = useInfiniteQuery({
        queryKey: ['contacts', 'blocked', debouncedSearch],
        initialPageParam: undefined as number | undefined,
        enabled: filter === 'blocked',
        initialData: !debouncedSearch
            ? buildContactsSnapshotInitialData(blockedSnapshot)
            : undefined,
        initialDataUpdatedAt: !debouncedSearch
            ? blockedSnapshot?.updatedAt
            : undefined,
        staleTime: CONTACTS_CACHE_STALE_TIME_MS,
        gcTime: CONTACTS_CACHE_GC_TIME_MS,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        queryFn: ({ pageParam }) =>
            contactService.getContactsPage({
                limit: CONTACTS_PAGE_LIMIT,
                cursor: typeof pageParam === 'number' ? pageParam : undefined,
                tab: 'blocked',
                q: debouncedSearch || undefined,
            }),
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    });

    const friendsMetaQuery = useQuery({
        queryKey: ['contacts-meta', 'friends'],
        enabled: Boolean(currentUser?.ID),
        staleTime: CONTACTS_CACHE_STALE_TIME_MS,
        gcTime: CONTACTS_CACHE_GC_TIME_MS,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        queryFn: () => contactService.getFriends(currentUser!.ID!),
    });

    const blockedMetaQuery = useQuery({
        queryKey: ['contacts-meta', 'blocked'],
        enabled: Boolean(currentUser?.ID),
        staleTime: CONTACTS_CACHE_STALE_TIME_MS,
        gcTime: CONTACTS_CACHE_GC_TIME_MS,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        queryFn: () => contactService.getBlockedUsers(currentUser!.ID!),
    });

    const availableCitiesQuery = useQuery({
        queryKey: ['contacts-meta', 'cities'],
        enabled: showCityPicker,
        staleTime: CONTACTS_CITIES_CACHE_TIME_MS,
        gcTime: CONTACTS_CITIES_CACHE_TIME_MS,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        queryFn: async () => {
            try {
                const response = await apiClient.get<string[]>('/dating/cities');
                if (Array.isArray(response.data) && response.data.length > 0) {
                    return response.data;
                }
            } catch (error) {
                console.error('Error fetching cities:', error);
            }

            return Array.from(
                new Set(allContactsRef.current.map((contact) => contact.city).filter(Boolean))
            ).sort();
        },
    });

    const allContacts = useMemo(
        () => mergeContactsPages(allContactsQuery.data?.pages),
        [allContactsQuery.data?.pages],
    );
    const friendsContacts = useMemo(
        () => mergeContactsPages(friendsContactsQuery.data?.pages),
        [friendsContactsQuery.data?.pages],
    );
    const blockedContacts = useMemo(
        () => mergeContactsPages(blockedContactsQuery.data?.pages),
        [blockedContactsQuery.data?.pages],
    );

    const allContactsHasMore = Boolean(allContactsQuery.hasNextPage);
    const friendsHasMore = Boolean(friendsContactsQuery.hasNextPage);
    const blockedHasMore = Boolean(blockedContactsQuery.hasNextPage);

    const loadingMore = allContactsQuery.isFetchingNextPage;
    const loadingMoreFriends = friendsContactsQuery.isFetchingNextPage;
    const loadingMoreBlocked = blockedContactsQuery.isFetchingNextPage;

    const activeLoading = filter === 'all'
        ? allContactsQuery.isLoading
        : filter === 'friends'
            ? friendsContactsQuery.isLoading
            : blockedContactsQuery.isLoading;
    const activeRefreshing = filter === 'all'
        ? allContactsQuery.isRefetching && !allContactsQuery.isFetchingNextPage
        : filter === 'friends'
            ? friendsContactsQuery.isRefetching && !friendsContactsQuery.isFetchingNextPage
            : blockedContactsQuery.isRefetching && !blockedContactsQuery.isFetchingNextPage;

    useEffect(() => {
        allContactsRef.current = allContacts;
    }, [allContacts]);

    useEffect(() => {
        if (!debouncedSearch && filterCities.length === 0) {
            writeContactsSnapshot('all', allContactsQuery.data);
        }
    }, [allContactsQuery.data, debouncedSearch, filterCities.length]);

    useEffect(() => {
        if (!debouncedSearch) {
            writeContactsSnapshot('friends', friendsContactsQuery.data);
        }
    }, [friendsContactsQuery.data, debouncedSearch]);

    useEffect(() => {
        if (!debouncedSearch) {
            writeContactsSnapshot('blocked', blockedContactsQuery.data);
        }
    }, [blockedContactsQuery.data, debouncedSearch]);

    useEffect(() => {
        if (debouncedSearch || filterCities.length > 0 || allContacts.length === 0) {
            return;
        }

        const urls = allContacts
            .slice(0, CONTACTS_AVATAR_PRELOAD_LIMIT)
            .map((contact) => getMediaUrl(contact.avatarUrl))
            .filter((url): url is string => Boolean(url))
            .filter((url) => !preloadedAvatarUrlsRef.current.has(url));

        if (urls.length === 0) {
            return;
        }

        FastImage.preload(
            urls.map((uri) => ({
                uri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
            })),
        );
        for (const url of urls) {
            preloadedAvatarUrlsRef.current.add(url);
        }
    }, [allContacts, debouncedSearch, filterCities.length]);

    const loadAllContacts = useCallback(async (_isRefresh = false, reset = false) => {
        if (reset) {
            await allContactsQuery.refetch();
            return;
        }
        if (allContactsQuery.hasNextPage) {
            await allContactsQuery.fetchNextPage();
        }
    }, [allContactsQuery]);

    const loadFriendsContacts = useCallback(async (_isRefresh = false, reset = false) => {
        if (reset) {
            await friendsContactsQuery.refetch();
            return;
        }
        if (friendsContactsQuery.hasNextPage) {
            await friendsContactsQuery.fetchNextPage();
        }
    }, [friendsContactsQuery]);

    const loadBlockedContacts = useCallback(async (_isRefresh = false, reset = false) => {
        if (reset) {
            await blockedContactsQuery.refetch();
            return;
        }
        if (blockedContactsQuery.hasNextPage) {
            await blockedContactsQuery.fetchNextPage();
        }
    }, [blockedContactsQuery]);

    const handleUnblock = useCallback(async (contactId: number) => {
        if (!currentUser?.ID) return;
        if (unblockingIdsRef.current.has(contactId)) return;
        unblockingIdsRef.current.add(contactId);
        try {
            await contactService.unblockUser(currentUser.ID, contactId);
            await invalidateContactsCaches(queryClient);
            await Promise.all([
                loadAllContacts(true, true),
                loadBlockedContacts(true, true),
                friendsMetaQuery.refetch(),
                blockedMetaQuery.refetch(),
            ]);
        } catch (error) {
            console.error('Error unblocking user:', error);
        } finally {
            unblockingIdsRef.current.delete(contactId);
        }
    }, [blockedMetaQuery, currentUser?.ID, friendsMetaQuery, loadAllContacts, loadBlockedContacts, queryClient]);

    const handleRefresh = useCallback(() => {
        if (activeLoading || activeRefreshing) {
            return;
        }
        if (filter === 'all') {
            void Promise.all([
                loadAllContacts(true, true),
                friendsMetaQuery.refetch(),
                blockedMetaQuery.refetch(),
            ]);
            return;
        }
        if (filter === 'friends') {
            void Promise.all([
                loadFriendsContacts(true, true),
                friendsMetaQuery.refetch(),
                blockedMetaQuery.refetch(),
            ]);
            return;
        }
        void Promise.all([
            loadBlockedContacts(true, true),
            friendsMetaQuery.refetch(),
            blockedMetaQuery.refetch(),
        ]);
    }, [activeLoading, activeRefreshing, blockedMetaQuery, filter, friendsMetaQuery, loadAllContacts, loadFriendsContacts, loadBlockedContacts]);

    const isOnline = (lastSeen: string) => {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        const diffMinutes = (Date.now() - lastSeenDate.getTime()) / 60000;
        return diffMinutes < 5; // Online if active in last 5 minutes
    };

    const formatLastSeen = useCallback((lastSeen: string) => {
        if (!lastSeen) return '';
        const date = new Date(lastSeen);

        // Simple localization based on user's device settings
        const isToday = new Date().toDateString() === date.toDateString();

        if (isToday) {
            return t('contacts.lastSeenToday', {
                time: date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
            });
        } else {
            return t('contacts.lastSeenDate', {
                date: date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            });
        }
    }, [i18n.language, t]);

    const friendIdsSet = useMemo(
        () => new Set((friendsMetaQuery.data || []).map((friend) => friend.ID)),
        [friendsMetaQuery.data],
    );
    const blockedIdsSet = useMemo(
        () => new Set((blockedMetaQuery.data || []).map((blocked) => blocked.ID)),
        [blockedMetaQuery.data],
    );

    const displayedContacts = useMemo(() => {
        // Если выбран фильтр "requests", показываем входящие запросы
        if (filter === 'requests') {
            return requests.map(req => ({
                ID: req.senderId,
                karmicName: req.senderName,
                spiritualName: '',
                nickname: '',
                email: '',
                avatarUrl: req.avatarUrl,
                lastSeen: '',
                identity: '',
                city: req.city,
                country: req.country,
                yatra: '',
                request: req, // сохраняем оригинальный запрос
            } as UserContact & { request: any }));
        }
        
        const sourceContacts = (
            filter === 'all' ? allContacts :
                filter === 'friends' ? friendsContacts : blockedContacts
        );

        return sourceContacts.filter((c: UserContact) => {
        const isSelf = currentUser?.ID && c.ID === currentUser.ID;
        if (isSelf) return false;

        // In All and Friends, don't show anyone who is blocked
        if (filter !== 'blocked') {
            const isBlocked = blockedIdsSet.has(c.ID);
            if (isBlocked) return false;
        }

        // Apply City Filter only for 'all' tab - support multiple cities
        if (filter === 'all' && filterCities.length > 0) {
            if (!filterCities.includes(c.city)) return false;
        }

        // Search by name, city, or country (debounced to reduce re-renders on typing)
        if (debouncedSearch && filter !== 'all') {
            const searchLower = debouncedSearch.toLowerCase();
            return c.karmicName?.toLowerCase().includes(searchLower) ||
                c.spiritualName?.toLowerCase().includes(searchLower) ||
                c.nickname?.toLowerCase().includes(searchLower) ||
                c.city?.toLowerCase().includes(searchLower) ||
                c.country?.toLowerCase().includes(searchLower) ||
                c.yatra?.toLowerCase().includes(searchLower);
        }

        return true;
        }).sort((a, b) => {
            if (filter === 'all') {
                const isFriendA = friendIdsSet.has(a.ID);
                const isFriendB = friendIdsSet.has(b.ID);
                if (isFriendA && !isFriendB) return -1;
                if (!isFriendA && isFriendB) return 1;
            }
            return 0;
        });
    }, [filter, requests, allContacts, friendsContacts, blockedContacts, currentUser?.ID, blockedIdsSet, filterCities, debouncedSearch, friendIdsSet]);

    const loadMoreContacts = useCallback(() => {
        if (filter === 'all') {
            if (!allContactsHasMore || loadingMore || activeLoading || activeRefreshing) return;
            void loadAllContacts(false, false);
            return;
        }
        if (filter === 'friends') {
            if (!friendsHasMore || loadingMoreFriends || activeLoading || activeRefreshing) return;
            void loadFriendsContacts(false, false);
            return;
        }
        if (!blockedHasMore || loadingMoreBlocked || activeLoading || activeRefreshing) return;
        void loadBlockedContacts(false, false);
    }, [
        filter,
        allContactsHasMore,
        friendsHasMore,
        blockedHasMore,
        loadingMore,
        loadingMoreFriends,
        loadingMoreBlocked,
        activeLoading,
        activeRefreshing,
        loadAllContacts,
        loadFriendsContacts,
        loadBlockedContacts,
    ]);

    const renderItem = useCallback(({ item }: { item: UserContact }) => {
        const avatarUrl = getMediaUrl(item.avatarUrl);
        const online = isOnline(item.lastSeen);
        const lastSeenText = !online ? formatLastSeen(item.lastSeen) : '';
        const isBlocked = filter === 'blocked';
        const isFriend = friendIdsSet.has(item.ID);
        const nameColor = usePhotoBg ? '#ffffff' : vTheme.colors.text;
        const descColor = usePhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary;
        const fallbackLabel = t('contacts.userFallback', { id: item.ID, defaultValue: `User #${item.ID}` }).replace(/\s*#\d+$/, '').trim() || 'User';

        const stringToColor = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            return '#' + '00000'.substring(0, 6 - c.length) + c;
        };
        const displayName = resolveUserDisplayName(item, { fallbackLabel });
        const avatarLetter = resolveUserDisplayInitial(item, { fallbackLabel });
        const nicknameLabel = resolveUserNicknameLabel(item);
        const avatarBgColor = stringToColor(displayName || item.ID.toString());

        return (
            <TouchableOpacity
                style={[styles.contactItem, {
                    backgroundColor: usePhotoBg ? 'transparent' : vTheme.colors.background,
                    borderBottomColor: usePhotoBg ? 'rgba(255,255,255,0.15)' : vTheme.colors.divider,
                }]}
                onPress={() => {
                    if (isBlocked) return;
                    if (isFriend) {
                        openChat(item);
                    } else {
                        navigation.navigate('ContactProfile', { userId: item.ID });
                    }
                }}
                disabled={isBlocked}
            >
                {(usePhotoBg || (isDarkMode && Platform.OS !== 'android')) && (
                    Platform.OS === 'android' ? (
                        <View
                            pointerEvents="none"
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    borderRadius: 22,
                                    backgroundColor: usePhotoBg ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.28)',
                                },
                            ]}
                        />
                    ) : (
                        <BlurView
                            style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                            blurType={isDarkMode ? "dark" : "light"}
                            blurAmount={15}
                            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                        />
                    )
                )}
                <View style={styles.avatarContainer}>
                    {avatarUrl ? (
                        <FastImage
                            source={{
                                uri: avatarUrl,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={styles.avatar}
                            onError={() => console.log('[Contacts] Avatar load failed for:', item.ID, avatarUrl)}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: avatarBgColor }]}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {avatarLetter}
                            </Text>
                        </View>
                    )}
                    {/* Зелёная галочка друга — зелёная если онлайн, иначе жёлтая */}
                    {isFriend && !isBlocked && (
                        <View
                            style={[
                                styles.friendAvatarBadge,
                                {
                                    backgroundColor: online ? '#4CAF50' : theme.accent, // Зелёный если онлайн, иначе жёлтый
                                    borderColor: usePhotoBg ? 'rgba(255,255,255,0.95)' : vTheme.colors.background,
                                },
                            ]}
                        >
                            <Check size={10} color="#fff" strokeWidth={3} />
                        </View>
                    )}
                    {/* Зелёную точку онлайн убрали чтобы не дублировать с галочкой друга */}
                </View>
                <View style={styles.contactInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.contactName, { color: nameColor }]} numberOfLines={1} ellipsizeMode="tail">
                            {displayName}
                        </Text>
                    </View>
                    <Text style={[styles.contactDesc, { color: descColor }]} numberOfLines={1}>
                        {nicknameLabel ? `${nicknameLabel} · ` : ''}
                        {online
                            ? `${item.country && item.city ? `${item.country}, ${item.city}` : (item.country || item.city || '')}`
                            : (lastSeenText || `${item.country && item.city ? `${item.country}, ${item.city}` : (item.country || item.city || '')}`)}
                    </Text>
                </View>
                {isBlocked ? (
                    <TouchableOpacity
                        onPress={() => handleUnblock(item.ID)}
                        style={styles.unblockBtn}
                    >
                        <Text style={[styles.unblockText, { color: theme.accent }]}>{t('contacts.unblock')}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isFriend && (
                            <TouchableOpacity
                                style={[
                                    styles.callBtn,
                                    {
                                        backgroundColor: usePhotoBg ? 'rgba(255,255,255,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'),
                                        borderColor: usePhotoBg ? 'rgba(255,255,255,0.3)' : 'transparent',
                                        borderWidth: usePhotoBg ? 1 : 0
                                    }
                                ]}
                                onPress={() => {
                                    openCall(item);
                                }}
                            >
                                <Phone size={18} color={usePhotoBg ? '#ffffff' : theme.primary} />
                            </TouchableOpacity>
                        )}
                        {isFriend && (
                            <TouchableOpacity
                                style={[
                                    styles.callBtn,
                                    {
                                        backgroundColor: usePhotoBg ? 'rgba(255,255,255,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'),
                                        borderColor: usePhotoBg ? 'rgba(255,255,255,0.3)' : 'transparent',
                                        borderWidth: usePhotoBg ? 1 : 0
                                    }
                                ]}
                                onPress={() => {
                                    openChat(item);
                                }}
                            >
                                <MessageCircle size={18} color={usePhotoBg ? '#ffffff' : theme.primary} />
                            </TouchableOpacity>
                        )}
                        <ChevronRight size={20} color={theme.accent} style={{ marginLeft: 10 }} />
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [
        filter,
        friendIdsSet,
        isDarkMode,
        navigation,
        openCall,
        openChat,
        t,
        theme.accent,
        theme.primary,
        usePhotoBg,
        vTheme.colors.background,
        vTheme.colors.divider,
        vTheme.colors.text,
        vTheme.colors.textSecondary,
        formatLastSeen,
        handleUnblock,
    ]);

    const toggleCityFilter = (city: string) => {
        setFilterCities((prev: string[]) => {
            if (prev.includes(city)) {
                return prev.filter(c => c !== city);
            } else {
                return [...prev, city];
            }
        });
    };

    const clearCityFilters = () => {
        setFilterCities([]);
    };

    const availableCities = availableCitiesQuery.data && availableCitiesQuery.data.length > 0
        ? availableCitiesQuery.data
        : Array.from(new Set(allContacts.map((c: UserContact) => c.city).filter(Boolean))).sort();

    const filteredCities = useMemo(() => availableCities.filter((city: string) =>
        city.toLowerCase().includes(citySearchQuery.toLowerCase())
    ), [availableCities, citySearchQuery]);
    const cityCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const contact of allContacts) {
            if (!contact.city) continue;
            counts.set(contact.city, (counts.get(contact.city) || 0) + 1);
        }
        return counts;
    }, [allContacts]);

    const uniqueCountries = useMemo(
        () => Array.from(new Set(allContacts.map((c: UserContact) => c.country).filter(Boolean))).sort(),
        [allContacts]
    );
    const uniqueCities = availableCities.length > 0
        ? availableCities
        : Array.from(new Set(allContacts.map((c: UserContact) => c.city).filter(Boolean))).sort();
    const allCount = allContactsQuery.data?.pages?.[0]?.total ?? allContacts.length;
    const friendsCount = friendsContactsQuery.data?.pages?.[0]?.total ?? friendsMetaQuery.data?.length ?? friendsContacts.length;
    const blockedCount = blockedContactsQuery.data?.pages?.[0]?.total ?? blockedMetaQuery.data?.length ?? blockedContacts.length;
    const useFlashList = shouldUseFlashList(true);
    const ContactsListComponent: any = useFlashList ? FlashList : FlatList;
    const keyExtractor = useCallback((item: UserContact) => item.ID.toString(), []);
    const listTuningProps = useMemo(() => (
        Platform.OS === 'android'
            ? {
                removeClippedSubviews: true,
                windowSize: isAndroidReducedEffects ? 5 : 7,
                initialNumToRender: isAndroidReducedEffects ? 6 : 8,
                maxToRenderPerBatch: isAndroidReducedEffects ? 4 : 6,
                updateCellsBatchingPeriod: isAndroidReducedEffects ? 40 : 28,
            }
            : { removeClippedSubviews: true }
    ), [isAndroidReducedEffects]);
    const listMeasureProps = useMemo(() => (
        useFlashList
            ? { estimatedItemSize: CONTACT_ITEM_HEIGHT }
            : {
                getItemLayout: (_data: ArrayLike<UserContact> | null | undefined, index: number) => ({
                    index,
                    length: CONTACT_ITEM_HEIGHT,
                    offset: CONTACT_ITEM_HEIGHT * index,
                }),
            }
    ), [useFlashList]);

    return (
        <ProtectedScreen requireCompleteProfile={false}>
            <ScreenScaffold variant="chat" enableAura={!isAndroidReducedEffects}>
            <View style={[styles.container, { backgroundColor: usePhotoBg ? 'transparent' : vTheme.colors.background }]}>
                <View style={styles.screenHeader}>
                    <TouchableOpacity
                        style={styles.screenBackButton}
                        onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Portal'))}
                    >
                        <ArrowLeft size={24} color={usePhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.screenHeaderTitle, { color: usePhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>
                        {t('contacts.title', { defaultValue: 'Contacts' })}
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('FriendRequests')}
                        style={styles.friendRequestsButton}
                    >
                        <Text style={[styles.friendRequestsText, { color: usePhotoBg ? '#ffffff' : theme.text }]}>
                            ✉️
                        </Text>
                        {friendRequestCount > 0 && (
                            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                                <Text style={styles.badgeText}>
                                    {friendRequestCount > 99 ? '99+' : friendRequestCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.filterBar}>
                    <TouchableOpacity
                        onPress={() => setFilter('all')}
                        style={[styles.filterBtn, filter === 'all' && { borderBottomColor: usePhotoBg ? '#ffffff' : theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: usePhotoBg ? (filter === 'all' ? '#ffffff' : 'rgba(255,255,255,0.7)') : (filter === 'all' ? theme.text : theme.subText) }]}>
                            {t('contacts.all')} ({allCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('requests')}
                        style={[styles.filterBtn, filter === 'requests' && { borderBottomColor: usePhotoBg ? '#ffffff' : theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: usePhotoBg ? (filter === 'requests' ? '#ffffff' : 'rgba(255,255,255,0.7)') : (filter === 'requests' ? theme.text : theme.subText) }]}>
                            {t('contacts.requests')}
                        </Text>
                        {friendRequestCount > 0 && (
                            <View style={[styles.countBadge, { backgroundColor: theme.accent }]}>
                                <Text style={styles.countBadgeText}>
                                    {friendRequestCount > 99 ? '99+' : friendRequestCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('friends')}
                        style={[styles.filterBtn, filter === 'friends' && { borderBottomColor: usePhotoBg ? '#ffffff' : theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: usePhotoBg ? (filter === 'friends' ? '#ffffff' : 'rgba(255,255,255,0.7)') : (filter === 'friends' ? theme.text : theme.subText) }]}>
                            {t('contacts.friends')} ({friendsCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('blocked')}
                        style={[styles.filterBtn, filter === 'blocked' && { borderBottomColor: usePhotoBg ? '#ffffff' : theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: usePhotoBg ? (filter === 'blocked' ? '#ffffff' : 'rgba(255,255,255,0.7)') : (filter === 'blocked' ? theme.text : theme.subText) }]}>
                            {t('contacts.blocked')} ({blockedCount})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Location Filters */}
                {filter === 'all' && (
                    <View style={[styles.filtersContainer, { backgroundColor: 'transparent', borderBottomColor: vTheme.colors.divider }]}>
                        {/* City Filter */}
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCities.length > 0 && { backgroundColor: theme.accent + '30', borderColor: theme.accent },
                                usePhotoBg && { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }
                            ]}
                            onPress={() => setShowCityPicker(true)}
                        >
                            <Text style={[styles.filterChipText, { color: usePhotoBg ? '#ffffff' : (filterCities.length > 0 ? theme.accent : theme.text) }]}>
                                {filterCities.length > 0 ? `${filterCities.length} ${t('contacts.cities')}` : t('contacts.city')}
                            </Text>
                            <ChevronDown size={14} color={filterCities.length > 0 ? theme.accent : theme.subText} style={{ marginLeft: 6 }} />
                            {filterCities.length > 0 && (
                                <TouchableOpacity
                                    onPress={clearCityFilters}
                                    style={styles.clearFilterBtn}
                                >
                                    <X size={14} color={theme.accent} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {/* Stats */}
                        <View style={styles.statsContainer}>
                            <Text style={[styles.statsText, { color: usePhotoBg ? 'rgba(255,255,255,0.8)' : theme.subText }]}>
                                {uniqueCities.length} {t('contacts.cities')} • {uniqueCountries.length} {t('contacts.countries')}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={[styles.searchContainer, {
                    backgroundColor: usePhotoBg ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
                    borderColor: usePhotoBg ? 'rgba(255,255,255,0.3)' : vTheme.colors.divider
                }]}>
                    <Search size={18} color={usePhotoBg ? 'rgba(255,255,255,0.7)' : theme.subText} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: usePhotoBg ? '#ffffff' : theme.inputText }]}
                        placeholder={filterCities.length > 0 ? t('contacts.searchingIn', { count: filterCities.length }) : t('contacts.searchBy')}
                        placeholderTextColor={usePhotoBg ? 'rgba(255,255,255,0.6)' : theme.subText}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={20} color={usePhotoBg ? '#ffffff' : theme.accent} />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <ContactsListComponent
                    data={displayedContacts}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshing={activeRefreshing}
                    onRefresh={handleRefresh}
                    onEndReached={loadMoreContacts}
                    onEndReachedThreshold={0.35}
                    {...listTuningProps}
                    {...listMeasureProps}
                    ListHeaderComponent={filter === 'blocked' && displayedContacts.length > 0 ? (
                        <Text style={[styles.blockedHint, { color: theme.subText }]}>
                            {t('contacts.blockConfirmMsg')}
                        </Text>
                    ) : null}
                    ListFooterComponent={((filter === 'all' && loadingMore) || (filter === 'friends' && loadingMoreFriends) || (filter === 'blocked' && loadingMoreBlocked)) ? (
                        <View style={styles.listFooterLoader}>
                            <ActivityIndicator color={theme.accent} />
                        </View>
                    ) : null}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {activeLoading ? (
                                <ActivityIndicator color={theme.accent} />
                            ) : (
                                <>
                                    <Text style={[styles.empty, { color: theme.subText }]}>
                                        {search ? t('contacts.noResults', { search }) : t('contacts.noContacts')}
                                    </Text>
                                    {filter === 'all' && filterCities.length > 0 && (
                                        <TouchableOpacity onPress={clearCityFilters}>
                                            <Text style={[styles.clearFilterLink, { color: theme.accent }]}>
                                                {t('contacts.clearCityFilter', { count: filterCities.length })}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </View>
                    }
                />

                {/* City Selection Modal - Multi-select with checkboxes */}
                <Modal
                    visible={showCityPicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowCityPicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        {(usePhotoBg || (isDarkMode && Platform.OS !== 'android')) && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="dark"
                                blurAmount={10}
                                reducedTransparencyFallbackColor="rgba(0,0,0,0.7)"
                            />
                        )}
                        <View style={[
                            styles.modalContent,
                            {
                                backgroundColor: usePhotoBg ? 'rgba(0,0,0,0.5)' : (isDarkMode ? 'rgba(30,30,30,0.94)' : 'rgba(255,255,255,0.98)'),
                                borderColor: usePhotoBg ? 'rgba(255,255,255,0.1)' : theme.borderColor,
                                borderWidth: 1,
                            }
                        ]}>
                            <TouchableOpacity
                                onPress={() => setShowCityPicker(false)}
                                style={[styles.closeModalBtn, { backgroundColor: usePhotoBg ? 'rgba(255,255,255,0.1)' : vTheme.colors.backgroundSecondary }]}
                            >
                                <X size={20} color={usePhotoBg ? '#FFF' : theme.subText} />
                            </TouchableOpacity>

                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: usePhotoBg ? '#FFF' : theme.text, fontFamily: 'Cinzel-Bold' }]}>
                                    {t('contacts.selectCities', { count: filterCities.length })}
                                </Text>
                            </View>

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: usePhotoBg ? 'rgba(255,255,255,0.1)' : theme.inputBackground,
                                        color: usePhotoBg ? '#FFF' : theme.text,
                                        borderColor: usePhotoBg ? 'rgba(255,255,255,0.2)' : theme.borderColor,
                                        marginBottom: 10
                                    }
                                ]}
                                value={citySearchQuery}
                                onChangeText={setCitySearchQuery}
                                placeholder={t('dating.searchCity')}
                                placeholderTextColor={usePhotoBg ? 'rgba(255,255,255,0.6)' : theme.subText}
                            />

                            {filterCities.length > 0 && (
                                <TouchableOpacity
                                    onPress={clearCityFilters}
                                    style={[styles.clearAllBtn, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}
                                >
                                    <Text style={[styles.clearAllBtnText, { color: '#EF4444' }]}>
                                        {t('contacts.clearAll', { count: filterCities.length })}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} indicatorStyle={isDarkMode || usePhotoBg ? 'white' : 'black'}>
                                {filteredCities.length === 0 ? (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={[styles.noResults, { color: usePhotoBg ? 'rgba(255,255,255,0.7)' : theme.subText }]}>
                                            {t('contacts.noCitiesFound')}
                                        </Text>
                                    </View>
                                ) : (
                                    filteredCities.map((city: string) => {
                                        const isSelected = filterCities.includes(city);
                                        const count = cityCounts.get(city) || 0;
                                        return (
                                            <TouchableOpacity
                                                key={city}
                                                style={[
                                                    styles.cityItem,
                                                    { borderBottomColor: usePhotoBg ? 'rgba(255,255,255,0.1)' : theme.borderColor },
                                                    isSelected && styles.cityItemSelected
                                                ]}
                                                onPress={() => toggleCityFilter(city)}
                                            >
                                                <View style={styles.cityItemLeft}>
                                                    {/* Checkbox */}
                                                    <View style={[
                                                        styles.checkbox,
                                                        { borderColor: usePhotoBg ? 'rgba(255,255,255,0.5)' : theme.borderColor },
                                                        isSelected && { backgroundColor: vTheme.colors.primary, borderColor: vTheme.colors.primary }
                                                    ]}>
                                                        {isSelected && (
                                                            <Check size={12} color="#FFF" strokeWidth={3} />
                                                        )}
                                                    </View>
                                                    <Text style={[styles.cityName, { color: usePhotoBg ? '#FFF' : theme.text }]} numberOfLines={1}>
                                                        {city.split(',')[0].trim()}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.cityCount, { color: usePhotoBg ? 'rgba(255,255,255,0.6)' : theme.subText, fontSize: 12 }]}>{count}</Text>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                onPress={() => setShowCityPicker(false)}
                                style={styles.applyBtnContainer}
                            >
                                <LinearGradient
                                    colors={['#3B82F6', '#2DD4BF']} // New Blue-Teal Gradient
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.applyBtnGradient}
                                >
                                    <Text style={[styles.applyBtnText, { color: '#FFF' }]}>
                                        {t('contacts.applyFilter', { count: filterCities.length })}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
            </ScreenScaffold>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    screenBackButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -8, // Compensate for padding to align with edge
    },
    screenHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    screenHeaderSpacer: {
        width: 40,
        height: 40,
    },
    friendRequestsButton: {
        position: 'relative',
        padding: 8,
    },
    friendRequestsText: {
        fontSize: 20,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#F44336',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    countBadge: {
        position: 'absolute',
        top: -4,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#F44336',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    countBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: 24,
        padding: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 20,
        paddingHorizontal: 30, // Added padding to avoid text touching close button area if it was relative
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    closeModalBtn: {
        position: 'absolute',
        top: 10,
        right: 14,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    applyBtnContainer: {
        marginTop: 16,
        borderRadius: 25,
        overflow: 'hidden',
    },
    applyBtnGradient: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    clearAllBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 12,
    },
    clearAllBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    cityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    cityItemSelected: {
        backgroundColor: 'rgba(255, 215, 0, 0.05)', // Subtle gold tint for selected
    },
    cityItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxCheck: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cityName: {
        fontSize: 16,
        fontWeight: '500',
    },
    cityCount: {
        fontWeight: '600',
    },
    applyBtn: {
        marginTop: 16,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Cinzel-Bold',
    },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    filterBtn: {
        paddingVertical: 10,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    filterText: {
        fontSize: 15,
        fontWeight: '600',
    },
    filtersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 0.5,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        marginRight: 8,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    clearFilterBtn: {
        marginLeft: 4,
    },
    statsContainer: {
        marginLeft: 'auto',
    },
    statsText: {
        fontSize: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 16,
        height: 44,
        borderRadius: 12,
        borderWidth: 0,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 4,
    },
    list: { paddingBottom: 20 },
    listFooterLoader: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        position: 'relative',
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
    onlineStatus: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    friendAvatarBadge: {
        position: 'absolute',
        left: -2,
        bottom: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    contactInfo: {
        flex: 1,
        marginLeft: 16,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactDesc: {
        fontSize: 13,
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    empty: {
        textAlign: 'center',
        fontSize: 16,
    },
    noResults: {
        textAlign: 'center',
        padding: 30,
        fontSize: 15,
        fontStyle: 'italic',
    },
    clearFilterLink: {
        textAlign: 'center',
        marginTop: 8,
        fontSize: 14,
    },
    unblockBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    unblockText: {
        fontSize: 13,
        fontWeight: '600',
    },
    blockedHint: {
        fontSize: 12,
        padding: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    callBtn: {
        padding: 8,
        borderRadius: 20,
        marginRight: 4,
    },
});
