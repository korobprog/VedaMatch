import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Eye, MessageCircle, Pin, Plus, Radio, Share2, Smile } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel, ChannelPost, ChannelPromotedAd } from '../../../../types/channel';
import { useSettings } from '../../../../context/SettingsContext';
import { useUser } from '../../../../context/UserContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { handleChannelPostCta, getChannelPostCtaLabel } from './channelCta';
import { BalancePill } from '../../../../components/wallet/BalancePill';
import { AssistantChatButton } from '../../../../components/portal/AssistantChatButton';

type HubTab = 'feed' | 'my';
type FeedListItem =
  | { type: 'post'; key: string; post: ChannelPost }
  | { type: 'ad'; key: string; ad: ChannelPromotedAd };

const FEED_PROMOTED_INTERVAL = 4;
const ERROR_LOG_THROTTLE_MS = 15000;
const OFFLINE_DEV_USER_ID = 999999;

const extractRequestErrorInfo = (error: unknown): { message: string; status: number | null } => {
  const maybeError = error as { message?: unknown; response?: { status?: unknown } };
  const status = typeof maybeError?.response?.status === 'number' ? maybeError.response.status : null;
  const rawMessage = typeof maybeError?.message === 'string' ? maybeError.message.trim() : '';
  return {
    message: rawMessage || 'unknown_error',
    status,
  };
};

export default function ChannelsHubScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, true);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<HubTab>('feed');

  const [feedPosts, setFeedPosts] = useState<ChannelPost[]>([]);
  const [feedPromotedAds, setFeedPromotedAds] = useState<ChannelPromotedAd[]>([]);
  const [feedPromotedInsertEvery, setFeedPromotedInsertEvery] = useState(FEED_PROMOTED_INTERVAL);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);

  const [myChannels, setMyChannels] = useState<Channel[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myRefreshing, setMyRefreshing] = useState(false);

  const mountedRef = useRef(true);
  const latestFeedReqRef = useRef(0);
  const latestMyReqRef = useRef(0);
  const lastFeedErrorLogAtRef = useRef(0);
  const lastMyErrorLogAtRef = useRef(0);
  const viewedPostIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestFeedReqRef.current += 1;
      latestMyReqRef.current += 1;
    };
  }, []);

  const loadFeed = useCallback(async (page: number, reset: boolean) => {
    if (user?.ID === OFFLINE_DEV_USER_ID) {
      if (page === 1) {
        setFeedPosts([]);
        setFeedPromotedAds([]);
        setFeedPage(1);
        setFeedHasMore(false);
      }
      setFeedLoading(false);
      setFeedRefreshing(false);
      setFeedLoadingMore(false);
      return;
    }

    const reqId = ++latestFeedReqRef.current;
    if (page === 1) {
      reset ? setFeedLoading(true) : setFeedRefreshing(true);
    } else {
      setFeedLoadingMore(true);
    }

    try {
      const response = await channelService.getFeed({ page, limit: 20 });
      if (!mountedRef.current || reqId !== latestFeedReqRef.current) {
        return;
      }

      if (page === 1) {
        setFeedPosts(response.posts);
        setFeedPromotedAds(response.promotedAds || []);
        setFeedPromotedInsertEvery(
          typeof response.promotedInsertEvery === 'number' && response.promotedInsertEvery >= 2
            ? response.promotedInsertEvery
            : FEED_PROMOTED_INTERVAL
        );
      } else {
        setFeedPosts(prev => {
          const seen = new Set(prev.map(item => item.ID));
          const next = response.posts.filter(item => !seen.has(item.ID));
          return [...prev, ...next];
        });
      }
      setFeedPage(page);
      setFeedHasMore(page < response.totalPages);
    } catch (error) {
      if (mountedRef.current && reqId === latestFeedReqRef.current && page === 1) {
        setFeedHasMore(false);
      }
      const { message, status } = extractRequestErrorInfo(error);
      const now = Date.now();
      if (now - lastFeedErrorLogAtRef.current > ERROR_LOG_THROTTLE_MS) {
        lastFeedErrorLogAtRef.current = now;
        const statusTag = status === null ? 'network' : String(status);
        console.warn(`[ChannelsHub] Failed to load feed (status=${statusTag}, message=${message})`);
      }
    } finally {
      if (mountedRef.current && reqId === latestFeedReqRef.current) {
        setFeedLoading(false);
        setFeedRefreshing(false);
        setFeedLoadingMore(false);
      }
    }
  }, [user?.ID]);

  const loadMyChannels = useCallback(async () => {
    if (user?.ID === OFFLINE_DEV_USER_ID) {
      setMyChannels([]);
      setMyLoading(false);
      setMyRefreshing(false);
      return;
    }

    const reqId = ++latestMyReqRef.current;
    setMyLoading(true);
    try {
      const response = await channelService.getMyChannels({ page: 1, limit: 50 });
      if (!mountedRef.current || reqId !== latestMyReqRef.current) {
        return;
      }
      setMyChannels(response.channels);
    } catch (error) {
      const { message, status } = extractRequestErrorInfo(error);
      const now = Date.now();
      if (now - lastMyErrorLogAtRef.current > ERROR_LOG_THROTTLE_MS) {
        lastMyErrorLogAtRef.current = now;
        const statusTag = status === null ? 'network' : String(status);
        console.warn(`[ChannelsHub] Failed to load my channels (status=${statusTag}, message=${message})`);
      }
      if (mountedRef.current && reqId === latestMyReqRef.current) {
        setMyChannels([]);
      }
    } finally {
      if (mountedRef.current && reqId === latestMyReqRef.current) {
        setMyLoading(false);
        setMyRefreshing(false);
      }
    }
  }, [user?.ID]);

  useEffect(() => {
    if (activeTab === 'feed') {
      void loadFeed(1, true);
    } else {
      void loadMyChannels();
    }
  }, [activeTab, loadFeed, loadMyChannels]);

  const onRefreshFeed = () => {
    if (feedLoading) {
      return;
    }
    void loadFeed(1, false);
  };

  const onRefreshMy = () => {
    if (myLoading) {
      return;
    }
    setMyRefreshing(true);
    void loadMyChannels();
  };

  const onFeedEndReached = () => {
    if (feedLoading || feedRefreshing || feedLoadingMore || !feedHasMore) {
      return;
    }
    void loadFeed(feedPage + 1, false);
  };

  const getPostStats = useCallback((post: ChannelPost) => {
    const stats = post.stats;
    return {
      views: stats?.views ?? post.viewCount ?? 0,
      reactions: stats?.reactions ?? post.reactionCount ?? 0,
      comments: stats?.comments ?? post.commentCount ?? 0,
      shares: stats?.shares ?? post.shareCount ?? 0,
    };
  }, []);

  const patchFeedPost = useCallback((postId: number, patcher: (post: ChannelPost) => ChannelPost) => {
    setFeedPosts(prev => prev.map(post => (post.ID === postId ? patcher(post) : post)));
  }, []);

  const trackViewOnce = useCallback((post: ChannelPost) => {
    if (viewedPostIdsRef.current.has(post.ID)) {
      return;
    }
    viewedPostIdsRef.current.add(post.ID);
    patchFeedPost(post.ID, current => {
      const stats = getPostStats(current);
      return { ...current, viewCount: stats.views + 1 };
    });
    void channelService.trackView(post.channelId, post.ID).catch(() => {
      viewedPostIdsRef.current.delete(post.ID);
    });
  }, [getPostStats, patchFeedPost]);

  const toggleReaction = useCallback((post: ChannelPost) => {
    const reactionEmoji = '❤️';
    const hadReaction = Boolean(post.myReaction);
    const stats = getPostStats(post);

    patchFeedPost(post.ID, current => ({
      ...current,
      myReaction: hadReaction ? undefined : reactionEmoji,
      reactionCount: Math.max(0, stats.reactions + (hadReaction ? -1 : 1)),
    }));

    const request = hadReaction
      ? channelService.removeReaction(post.channelId, post.ID)
      : channelService.setReaction(post.channelId, post.ID, reactionEmoji);

    void request.catch(() => {
      patchFeedPost(post.ID, current => ({
        ...current,
        myReaction: post.myReaction,
        reactionCount: stats.reactions,
      }));
    });
  }, [getPostStats, patchFeedPost]);

  const openComments = useCallback(async (post: ChannelPost) => {
    try {
      const response = await channelService.listComments(post.channelId, post.ID, { limit: 10 });
      const comments = response.comments || [];
      if (comments.length === 0) {
        Alert.alert('Комментарии', 'Комментариев пока нет');
        return;
      }
      const preview = comments
        .slice(0, 5)
        .map(item => `• ${item.body}`)
        .join('\n');
      Alert.alert('Комментарии', preview);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить комментарии');
    }
  }, []);

  const sharePost = useCallback(async (post: ChannelPost) => {
    try {
      await Share.share({
        message: `${post.content || 'Пост в канале'}\n\nКанал: ${post.channel?.title || `#${post.channelId}`}`,
      });
      patchFeedPost(post.ID, current => {
        const stats = getPostStats(current);
        return { ...current, shareCount: stats.shares + 1 };
      });
      await channelService.trackShare(post.channelId, post.ID);
    } catch {
      // no-op: пользователь мог отменить share sheet
    }
  }, [getPostStats, patchFeedPost]);

  const renderFeedPost = (item: ChannelPost) => {
    const ctaLabel = getChannelPostCtaLabel(item);
    const publishedAt = item.publishedAt || item.CreatedAt;

    return (
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.9}
        onPress={() => {
          trackViewOnce(item);
          navigation.navigate('ChannelDetails', { channelId: item.channelId });
        }}
      >
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <Radio size={16} color={colors.accent} />
            <Text style={styles.postChannelName} numberOfLines={1}>
              {item.channel?.title || `Канал #${item.channelId}`}
            </Text>
          </View>
          {item.isPinned ? (
            <View style={styles.pinnedBadge}>
              <Pin size={12} color={colors.accent} />
              <Text style={styles.pinnedText}>Закреп</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.postContent} numberOfLines={4}>
          {item.content || 'Без текста'}
        </Text>

        <View style={styles.postFooter}>
          <Text style={styles.postDate}>
            {new Date(publishedAt).toLocaleString('ru-RU')}
          </Text>
          {ctaLabel ? (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => handleChannelPostCta(navigation, item)}
            >
              <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => toggleReaction(item)}>
            <Smile size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{item.myReaction || '❤️'} {getPostStats(item).reactions}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => void openComments(item)}>
            <MessageCircle size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{getPostStats(item).comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => void sharePost(item)}>
            <Share2 size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{getPostStats(item).shares}</Text>
          </TouchableOpacity>
          <View style={styles.actionItem}>
            <Eye size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{getPostStats(item).views}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const formatAdPrice = (ad: ChannelPromotedAd) => {
    if (ad.isFree) {
      return 'Бесплатно';
    }
    if (typeof ad.price === 'number') {
      return `${ad.price} ${ad.currency || 'RUB'}`;
    }
    return ad.currency || 'RUB';
  };

  const renderPromotedFeedItem = (ad: ChannelPromotedAd) => {
    return (
      <TouchableOpacity
        style={styles.promotedCard}
        activeOpacity={0.9}
        onPress={() => {
          void channelService.trackPromotedAdClick(ad.id).catch(() => { });
          navigation.navigate('AdDetail', { adId: ad.id });
        }}
      >
        <View style={styles.promotedHeader}>
          <Text style={styles.promotedBadge}>Промо</Text>
          <Text style={styles.promotedCity}>{ad.city}</Text>
        </View>
        <Text style={styles.promotedCardTitle} numberOfLines={2}>{ad.title}</Text>
        <Text style={styles.promotedDescription} numberOfLines={2}>{ad.description}</Text>
        <Text style={styles.promotedPrice}>{formatAdPrice(ad)}</Text>
      </TouchableOpacity>
    );
  };

  const feedItems = React.useMemo<FeedListItem[]>(() => {
    if (feedPosts.length === 0) {
      return [];
    }

    const insertEvery = Math.max(2, feedPromotedInsertEvery || FEED_PROMOTED_INTERVAL);
    const mixed: FeedListItem[] = [];
    let adIndex = 0;

    for (let i = 0; i < feedPosts.length; i += 1) {
      const post = feedPosts[i];
      mixed.push({
        type: 'post',
        key: `post-${post.ID}`,
        post,
      });

      const shouldInsertAd = (i + 1) % insertEvery === 0 && adIndex < feedPromotedAds.length;
      if (shouldInsertAd) {
        const ad = feedPromotedAds[adIndex];
        mixed.push({
          type: 'ad',
          key: `ad-${ad.id}-${i}`,
          ad,
        });
        adIndex += 1;
      }
    }

    if (adIndex === 0 && feedPromotedAds.length > 0) {
      const ad = feedPromotedAds[0];
      mixed.push({
        type: 'ad',
        key: `ad-tail-${ad.id}`,
        ad,
      });
    }

    return mixed;
  }, [feedPosts, feedPromotedAds, feedPromotedInsertEvery]);

  const renderFeedListItem = ({ item }: { item: FeedListItem }) => {
    if (item.type === 'ad') {
      return renderPromotedFeedItem(item.ad);
    }
    return renderFeedPost(item.post);
  };

  const renderMyChannelItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.channelCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ChannelDetails', { channelId: item.ID })}
    >
      <View style={styles.channelCardHeader}>
        <Text style={styles.channelTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[styles.visibilityBadge, item.isPublic ? styles.publicBadge : styles.privateBadge]}>
          <Text style={styles.visibilityText}>{item.isPublic ? 'Публичный' : 'Приватный'}</Text>
        </View>
      </View>
      <Text style={styles.channelDescription} numberOfLines={2}>
        {item.description || 'Описание канала не заполнено'}
      </Text>
      <Text style={styles.channelMeta}>@{item.slug}</Text>
    </TouchableOpacity>
  );

  const renderFeedEmpty = () => {
    if (feedLoading) {
      return null;
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Пока нет публикаций</Text>
        <Text style={styles.emptySubtitle}>Лента появится после публикации первых постов</Text>
      </View>
    );
  };

  const renderMyEmpty = () => {
    if (myLoading) {
      return null;
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>У вас пока нет каналов</Text>
        <Text style={styles.emptySubtitle}>Создайте канал и начните публиковать посты</Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Каналы и лента</Text>
          <View style={styles.headerActions}>
            <AssistantChatButton size={36} />
            <BalancePill size="small" lightMode={true} />
            {activeTab === 'my' ? (
              <TouchableOpacity
                style={[styles.headerButton, styles.headerActionButton]}
                onPress={() => navigation.navigate('CreateChannel')}
              >
                <Plus size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'feed' && styles.activeTabButton]}
            onPress={() => setActiveTab('feed')}
          >
            <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Лента</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'my' && styles.activeTabButton]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>Мои каналы</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'feed' ? (
          <>
            {feedLoading && feedPosts.length === 0 ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={feedItems}
                keyExtractor={item => item.key}
                contentContainerStyle={styles.listContent}
                renderItem={renderFeedListItem}
                refreshControl={
                  <RefreshControl
                    refreshing={feedRefreshing}
                    onRefresh={onRefreshFeed}
                    tintColor={colors.accent}
                  />
                }
                ListEmptyComponent={renderFeedEmpty}
                onEndReached={onFeedEndReached}
                onEndReachedThreshold={0.4}
                ListFooterComponent={feedLoadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : null}
              />
            )}
          </>
        ) : (
          <>
            {myLoading && myChannels.length === 0 ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={myChannels}
                keyExtractor={item => item.ID.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={renderMyChannelItem}
                refreshControl={
                  <RefreshControl
                    refreshing={myRefreshing}
                    onRefresh={onRefreshMy}
                    tintColor={colors.accent}
                  />
                }
                ListEmptyComponent={renderMyEmpty}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerActionButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButtonPlaceholder: {
      width: 36,
      height: 36,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    tabBar: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      flexDirection: 'row',
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    activeTabButton: {
      backgroundColor: colors.accent,
    },
    tabText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    activeTabText: {
      color: colors.textPrimary,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    postHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    postChannelName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    postContent: {
      color: colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
    },
    postFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    actionText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    postDate: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
    pinnedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accentSoft,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    pinnedText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
    },
    ctaButton: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    ctaButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    promotedCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      padding: 12,
      gap: 6,
    },
    promotedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    promotedBadge: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    promotedCity: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    promotedCardTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    promotedDescription: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    promotedPrice: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
    },
    channelCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    channelCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'center',
    },
    channelTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      flex: 1,
    },
    visibilityBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
    },
    publicBadge: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    privateBadge: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
    },
    visibilityText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    channelDescription: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    channelMeta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    footerLoader: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 64,
      gap: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
  });
