import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Pin, Plus, Radio } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel, ChannelPost } from '../../../../types/channel';
import { useSettings } from '../../../../context/SettingsContext';
import { useUser } from '../../../../context/UserContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { handleChannelPostCta, getChannelPostCtaLabel } from './channelCta';

type HubTab = 'feed' | 'my';

export default function ChannelsHubScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<HubTab>('feed');

  const [feedPosts, setFeedPosts] = useState<ChannelPost[]>([]);
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
      console.error('[ChannelsHub] Failed to load feed:', error);
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
      console.error('[ChannelsHub] Failed to load my channels:', error);
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

  const renderFeedItem = ({ item }: { item: ChannelPost }) => {
    const ctaLabel = getChannelPostCtaLabel(item);
    const publishedAt = item.publishedAt || item.CreatedAt;

    return (
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ChannelDetails', { channelId: item.channelId })}
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
      </TouchableOpacity>
    );
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
          {activeTab === 'my' ? (
            <TouchableOpacity
              style={[styles.headerButton, styles.headerActionButton]}
              onPress={() => navigation.navigate('CreateChannel')}
            >
              <Plus size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButtonPlaceholder} />
          )}
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
                data={feedPosts}
                keyExtractor={item => item.ID.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={renderFeedItem}
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
