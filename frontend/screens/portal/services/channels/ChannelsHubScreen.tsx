import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {
  ArrowLeft,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Radio,
  Share2,
  Smile,
  Video,
} from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import {
  Channel,
  ChannelPost,
  ChannelPostComment,
  ChannelPostMediaCircle,
  ChannelPostMediaImage,
  ChannelPromotedAd,
} from '../../../../types/channel';
import { useUser } from '../../../../context/UserContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { handleChannelPostCta, getChannelPostCtaLabel } from './channelCta';
import { BalancePill } from '../../../../components/wallet/BalancePill';
import { AssistantChatButton } from '../../../../components/portal/AssistantChatButton';

type HubTab = 'feed' | 'my';
type FeedListItem =
  | { type: 'post'; key: string; post: ChannelPost }
  | { type: 'ad'; key: string; ad: ChannelPromotedAd };

type ParsedPostMedia = {
  images: ChannelPostMediaImage[];
  circles: ChannelPostMediaCircle[];
};

const FEED_PROMOTED_INTERVAL = 4;
const ERROR_LOG_THROTTLE_MS = 15000;
const POST_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const extractRequestErrorInfo = (error: unknown): { message: string; status: number | null } => {
  const maybeError = error as { message?: unknown; response?: { status?: unknown } };
  const status = typeof maybeError?.response?.status === 'number' ? maybeError.response.status : null;
  const rawMessage = typeof maybeError?.message === 'string' ? maybeError.message.trim() : '';
  return {
    message: rawMessage || 'unknown_error',
    status,
  };
};

const parsePostMedia = (raw: string): ParsedPostMedia => {
  const fallback: ParsedPostMedia = { images: [], circles: [] };
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed) as { images?: ChannelPostMediaImage[]; circles?: ChannelPostMediaCircle[] };
    const images = Array.isArray(parsed?.images)
      ? parsed.images.filter(item => item && item.url)
      : [];
    const circles = Array.isArray(parsed?.circles)
      ? parsed.circles.filter(item => item && Number(item.id) > 0 && item.mediaUrl)
      : [];
    return {
      images: images.slice(0, 5),
      circles: circles.slice(0, 10),
    };
  } catch {
    return fallback;
  }
};

const isAuthorEditAllowed = (post: ChannelPost): boolean => {
  if (post.status !== 'published') {
    return true;
  }
  const publishedRaw = post.publishedAt || post.CreatedAt;
  if (!publishedRaw) {
    return false;
  }
  const publishedAt = new Date(publishedRaw);
  if (Number.isNaN(publishedAt.getTime())) {
    return false;
  }
  return Date.now() - publishedAt.getTime() <= POST_EDIT_WINDOW_MS;
};

export default function ChannelsHubScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
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

  const [commentsSheetVisible, setCommentsSheetVisible] = useState(false);
  const [commentsSheetPost, setCommentsSheetPost] = useState<ChannelPost | null>(null);
  const [commentsSheetItems, setCommentsSheetItems] = useState<ChannelPostComment[]>([]);
  const [commentsSheetCursor, setCommentsSheetCursor] = useState<number | undefined>(undefined);
  const [commentsSheetLoading, setCommentsSheetLoading] = useState(false);
  const [commentsSheetSubmitting, setCommentsSheetSubmitting] = useState(false);
  const [commentsSheetText, setCommentsSheetText] = useState('');

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
  }, []);

  const loadMyChannels = useCallback(async () => {
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
  }, []);

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

  const loadComments = useCallback(async (post: ChannelPost, cursor?: number, append = false) => {
    setCommentsSheetLoading(true);
    try {
      const response = await channelService.listComments(post.channelId, post.ID, {
        limit: 20,
        ...(cursor ? { cursor } : {}),
      });
      const items = response.comments || [];
      setCommentsSheetItems(prev => (append ? [...prev, ...items] : items));
      setCommentsSheetCursor(response.nextCursor);
    } catch {
      if (!append) {
        setCommentsSheetItems([]);
      }
      Alert.alert('Ошибка', 'Не удалось загрузить комментарии');
    } finally {
      setCommentsSheetLoading(false);
    }
  }, []);

  const openComments = useCallback((post: ChannelPost) => {
    setCommentsSheetPost(post);
    setCommentsSheetVisible(true);
    setCommentsSheetItems([]);
    setCommentsSheetCursor(undefined);
    setCommentsSheetText('');
    void loadComments(post, undefined, false);
  }, [loadComments]);

  const closeComments = useCallback(() => {
    setCommentsSheetVisible(false);
    setCommentsSheetPost(null);
    setCommentsSheetItems([]);
    setCommentsSheetCursor(undefined);
    setCommentsSheetText('');
  }, []);

  const submitComment = useCallback(async () => {
    const post = commentsSheetPost;
    const body = commentsSheetText.trim();
    if (!post || !body || commentsSheetSubmitting) {
      return;
    }

    const optimisticID = Date.now() * -1;
    const optimisticComment: ChannelPostComment = {
      ID: optimisticID,
      postId: post.ID,
      userId: user?.ID || 0,
      body,
      isDeleted: false,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      user: {
        id: user?.ID || 0,
        spiritualName: user?.spiritualName || '',
        karmicName: user?.karmicName || '',
        avatarUrl: user?.avatar || '',
      },
    };

    setCommentsSheetSubmitting(true);
    setCommentsSheetText('');
    setCommentsSheetItems(prev => [optimisticComment, ...prev]);
    patchFeedPost(post.ID, current => {
      const stats = getPostStats(current);
      return { ...current, commentCount: stats.comments + 1 };
    });

    try {
      const created = await channelService.addComment(post.channelId, post.ID, body);
      setCommentsSheetItems(prev => prev.map(item => (item.ID === optimisticID ? created : item)));
    } catch (error: any) {
      setCommentsSheetItems(prev => prev.filter(item => item.ID !== optimisticID));
      patchFeedPost(post.ID, current => {
        const stats = getPostStats(current);
        return { ...current, commentCount: Math.max(0, stats.comments - 1) };
      });
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось отправить комментарий');
    } finally {
      setCommentsSheetSubmitting(false);
    }
  }, [commentsSheetPost, commentsSheetSubmitting, commentsSheetText, getPostStats, patchFeedPost, user]);

  const loadMoreComments = useCallback(() => {
    if (!commentsSheetPost || !commentsSheetCursor || commentsSheetLoading) {
      return;
    }
    void loadComments(commentsSheetPost, commentsSheetCursor, true);
  }, [commentsSheetCursor, commentsSheetLoading, commentsSheetPost, loadComments]);

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

  const openPostMenu = useCallback((post: ChannelPost) => {
    const editable = isAuthorEditAllowed(post);
    Alert.alert('Пост', editable ? 'Действия с постом' : 'Редактирование опубликованного поста доступно только в первые 24 часа', [
      {
        text: 'Редактировать',
        onPress: () => {
          if (!editable) {
            Alert.alert('Недоступно', 'Для автора окно редактирования опубликованного поста уже закрыто.');
            return;
          }
          navigation.navigate('ChannelPostComposer', {
            channelId: post.channelId,
            mode: 'edit',
            postId: post.ID,
            initialPost: post,
          });
        },
      },
      {
        text: 'Отмена',
        style: 'cancel',
      },
    ]);
  }, [navigation]);

  const renderMediaBlock = useCallback((post: ChannelPost) => {
    const media = parsePostMedia(post.mediaJson);
    if (media.images.length === 0 && media.circles.length === 0) {
      return null;
    }

    return (
      <View style={styles.mediaBlock}>
        {media.images.length > 0 ? (
          <FlatList
            data={media.images}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaRow}
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={styles.postImage} resizeMode="cover" />
            )}
          />
        ) : null}

        {media.circles.length > 0 ? (
          <FlatList
            data={media.circles}
            keyExtractor={(item) => `circle-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.circleCard}
                onPress={() =>
                  navigation.navigate('VideoPlayer', {
                    video: { uri: item.mediaUrl, title: `Кружок #${item.id}` },
                    source: 'video_circles',
                    circle: {
                      id: item.id,
                      authorId: post.authorId,
                      mediaUrl: item.mediaUrl,
                      thumbnailUrl: item.thumbnailUrl,
                      city: '',
                      matha: '',
                      category: '',
                      likeCount: 0,
                      commentCount: 0,
                      chatCount: 0,
                    },
                  })
                }
              >
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.circleThumb} />
                ) : (
                  <View style={styles.circleThumbFallback}>
                    <Video size={15} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={styles.circleLabel}>Кружок #{item.id}</Text>
              </TouchableOpacity>
            )}
          />
        ) : null}
      </View>
    );
  }, [colors.textSecondary, navigation, styles.circleCard, styles.circleLabel, styles.circleThumb, styles.circleThumbFallback, styles.mediaBlock, styles.mediaRow, styles.postImage]);

  const renderFeedPost = (item: ChannelPost) => {
    const ctaLabel = getChannelPostCtaLabel(item);
    const publishedAt = item.publishedAt || item.CreatedAt;
    const isAuthor = Boolean(user?.ID) && item.authorId === user?.ID;

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
          <View style={styles.postHeaderRight}>
            {item.isPinned ? (
              <View style={styles.pinnedBadge}>
                <Pin size={12} color={colors.accent} />
                <Text style={styles.pinnedText}>Закреп</Text>
              </View>
            ) : null}
            {isAuthor ? (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => openPostMenu(item)}
                testID={`post-menu-${item.ID}`}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <MoreHorizontal size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={styles.postContent} numberOfLines={4}>
          {item.content || 'Без текста'}
        </Text>

        {renderMediaBlock(item)}

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
          <TouchableOpacity style={styles.actionItem} onPress={() => openComments(item)}>
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

        <Modal visible={commentsSheetVisible} transparent animationType="slide" onRequestClose={closeComments}>
          <View style={styles.commentsOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeComments} />
            <View style={styles.commentsSheet}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Комментарии</Text>
                <TouchableOpacity style={styles.commentsCloseBtn} onPress={closeComments}>
                  <Text style={styles.commentsCloseText}>Закрыть</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.commentsSubtitle}>
                {commentsSheetPost?.channel?.title || `Канал #${commentsSheetPost?.channelId || ''}`}
              </Text>

              {commentsSheetLoading && commentsSheetItems.length === 0 ? (
                <View style={styles.commentsLoader}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : (
                <FlatList
                  data={commentsSheetItems}
                  keyExtractor={item => item.ID.toString()}
                  style={styles.commentsList}
                  contentContainerStyle={styles.commentsListContent}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>
                        {item.user?.spiritualName || item.user?.karmicName || `User #${item.userId}`}
                      </Text>
                      <Text style={styles.commentBody}>{item.body}</Text>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={styles.commentsEmpty}>Комментариев пока нет</Text>}
                  ListFooterComponent={
                    commentsSheetCursor ? (
                      <TouchableOpacity style={styles.moreCommentsBtn} onPress={loadMoreComments}>
                        <Text style={styles.moreCommentsText}>Загрузить еще</Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              )}

              <View style={styles.commentComposer}>
                <TextInput
                  value={commentsSheetText}
                  onChangeText={setCommentsSheetText}
                  placeholder="Написать комментарий..."
                  placeholderTextColor={colors.textSecondary}
                  style={styles.commentInput}
                  editable={!commentsSheetSubmitting}
                />
                <TouchableOpacity
                  style={[styles.sendCommentBtn, commentsSheetSubmitting && styles.sendCommentBtnDisabled]}
                  onPress={() => void submitComment()}
                  disabled={commentsSheetSubmitting}
                >
                  {commentsSheetSubmitting ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Text style={styles.sendCommentText}>Отправить</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    postHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    menuButton: {
      width: 26,
      height: 26,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
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
    mediaBlock: {
      gap: 8,
    },
    mediaRow: {
      gap: 8,
    },
    postImage: {
      width: 126,
      height: 158,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    circleCard: {
      width: 92,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    circleThumb: {
      width: 52,
      height: 52,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    circleThumbFallback: {
      width: 52,
      height: 52,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
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
    commentsOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(5, 7, 12, 0.45)',
    },
    commentsSheet: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
      backgroundColor: colors.background,
      minHeight: '45%',
      maxHeight: '80%',
      paddingTop: 14,
      paddingHorizontal: 14,
      paddingBottom: 18,
      gap: 10,
    },
    commentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    commentsTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    commentsCloseBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    commentsCloseText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    commentsSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    commentsLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    commentsList: {
      maxHeight: 320,
    },
    commentsListContent: {
      gap: 8,
      paddingBottom: 4,
    },
    commentItem: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    commentAuthor: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    commentBody: {
      color: colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    commentsEmpty: {
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 16,
    },
    moreCommentsBtn: {
      alignSelf: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 4,
    },
    moreCommentsText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    commentComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    commentInput: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: 10,
      paddingVertical: 9,
      fontSize: 13,
    },
    sendCommentBtn: {
      borderRadius: 10,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 88,
    },
    sendCommentBtnDisabled: {
      opacity: 0.8,
    },
    sendCommentText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
  });
