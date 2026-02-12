import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Pin, PlusCircle, Settings2 } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel, ChannelMemberRole, ChannelPost, ChannelShowcase } from '../../../../types/channel';
import { marketService } from '../../../../services/marketService';
import { getServiceById, getServices } from '../../../../services/serviceService';
import type { Product } from '../../../../types/market';
import type { Service } from '../../../../services/serviceService';
import { useSettings } from '../../../../context/SettingsContext';
import { useUser } from '../../../../context/UserContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { getChannelPostCtaLabel, handleChannelPostCta } from './channelCta';

type RouteParams = {
  ChannelDetails: {
    channelId: number;
  };
};

const canEditPosts = (role?: ChannelMemberRole) => role === 'owner' || role === 'admin' || role === 'editor';
const canModeratePosts = (role?: ChannelMemberRole) => role === 'owner' || role === 'admin';
const MAX_SHOWCASE_PREVIEW_ITEMS = 4;

type ShowcaseFilterPayload = {
  category?: string;
  shopId?: number;
  productIds?: number[];
  serviceIds?: number[];
  limit?: number;
};

const toPositiveInt = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed > 0 ? Math.floor(parsed) : 0;
};

const parseShowcaseFilter = (raw: string): ShowcaseFilterPayload => {
  if (!raw || !raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed as ShowcaseFilterPayload;
  } catch {
    return {};
  }
};

const resolvePreviewLimit = (filter: ShowcaseFilterPayload): number => {
  const value = toPositiveInt(filter.limit);
  if (value > 0 && value <= 12) {
    return value;
  }
  return MAX_SHOWCASE_PREVIEW_ITEMS;
};

export default function ChannelDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ChannelDetails'>>();
  const channelId = route.params?.channelId;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewerRole, setViewerRole] = useState<ChannelMemberRole | undefined>(undefined);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [showcases, setShowcases] = useState<ChannelShowcase[]>([]);
  const [showcaseProducts, setShowcaseProducts] = useState<Record<number, Product[]>>({});
  const [showcaseServices, setShowcaseServices] = useState<Record<number, Service[]>>({});
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [includeDraft, setIncludeDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyPostId, setBusyPostId] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const latestLoadRef = useRef(0);
  const latestShowcaseReqRef = useRef(0);
  const includeDraftLoadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestLoadRef.current += 1;
    };
  }, []);

  const loadData = useCallback(async (isRefresh: boolean) => {
    if (!channelId) {
      return;
    }

    const reqId = ++latestLoadRef.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const channelResponse = await channelService.getChannel(channelId);
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      setChannel(channelResponse.channel);
      if (channelResponse.viewerRole) {
        setViewerRole(channelResponse.viewerRole);
      }

      const [postsResponse, showcasesResponse] = await Promise.all([
        channelService.listPosts(channelId, { page: 1, limit: 100, includeDraft }),
        channelService.listShowcases(channelId),
      ]);

      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }

      setPosts(postsResponse.posts);
      if (postsResponse.viewerRole) {
        setViewerRole(postsResponse.viewerRole);
      }
      setShowcases(showcasesResponse.showcases || []);
    } catch (error: any) {
      console.error('[ChannelDetails] Failed to load channel:', error);
      if (mountedRef.current && reqId === latestLoadRef.current) {
        Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось загрузить канал');
      }
    } finally {
      if (mountedRef.current && reqId === latestLoadRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [channelId, includeDraft]);

  useFocusEffect(
    useCallback(() => {
      void loadData(false);
    }, [loadData])
  );

  useEffect(() => {
    if (!includeDraftLoadedRef.current) {
      includeDraftLoadedRef.current = true;
      return;
    }
    void loadData(true);
  }, [includeDraft, loadData]);

  const loadShowcasePreviews = useCallback(async (items: ChannelShowcase[]) => {
    if (!items.length) {
      setShowcaseProducts({});
      setShowcaseServices({});
      setShowcaseLoading(false);
      return;
    }

    const reqId = ++latestShowcaseReqRef.current;
    setShowcaseLoading(true);

    const productsMap: Record<number, Product[]> = {};
    const servicesMap: Record<number, Service[]> = {};

    await Promise.all(
      items.map(async showcase => {
        const kind = (showcase.kind || '').toLowerCase();
        const filter = parseShowcaseFilter(showcase.filterJson);
        const limit = resolvePreviewLimit(filter);

        try {
          if (kind.includes('service')) {
            const serviceIDs = Array.isArray(filter.serviceIds)
              ? filter.serviceIds.map(id => toPositiveInt(id)).filter(id => id > 0).slice(0, limit)
              : [];

            if (serviceIDs.length > 0) {
              const loaded = await Promise.all(
                serviceIDs.map(async serviceId => {
                  try {
                    return await getServiceById(serviceId);
                  } catch {
                    return null;
                  }
                })
              );
              servicesMap[showcase.ID] = loaded.filter((item): item is Service => Boolean(item));
            } else {
              const response = await getServices({
                page: 1,
                limit,
                category: filter.category as any,
              });
              servicesMap[showcase.ID] = response.services || [];
            }
          } else {
            const productIDs = Array.isArray(filter.productIds)
              ? filter.productIds.map(id => toPositiveInt(id)).filter(id => id > 0).slice(0, limit)
              : [];

            if (productIDs.length > 0) {
              const loaded = await Promise.all(
                productIDs.map(async productId => {
                  try {
                    return await marketService.getProduct(productId);
                  } catch {
                    return null;
                  }
                })
              );
              productsMap[showcase.ID] = loaded.filter((item): item is Product => Boolean(item));
            } else {
              const response = await marketService.getProducts({
                page: 1,
                limit,
                category: filter.category as any,
                shopId: toPositiveInt(filter.shopId) || undefined,
              });
              productsMap[showcase.ID] = response.products || [];
            }
          }
        } catch {
          productsMap[showcase.ID] = productsMap[showcase.ID] || [];
          servicesMap[showcase.ID] = servicesMap[showcase.ID] || [];
        }
      })
    );

    if (!mountedRef.current || reqId !== latestShowcaseReqRef.current) {
      return;
    }

    setShowcaseProducts(productsMap);
    setShowcaseServices(servicesMap);
    setShowcaseLoading(false);
  }, []);

  useEffect(() => {
    void loadShowcasePreviews(showcases);
  }, [showcases, loadShowcasePreviews]);

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }
    void loadData(true);
  };

  const isEditor = canEditPosts(viewerRole);
  const isModerator = canModeratePosts(viewerRole);

  const togglePin = async (post: ChannelPost) => {
    if (!channelId || !isModerator || busyPostId !== null) {
      return;
    }
    setBusyPostId(post.ID);
    try {
      if (post.isPinned) {
        await channelService.unpinPost(channelId, post.ID);
      } else {
        await channelService.pinPost(channelId, post.ID);
      }
      await loadData(true);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить закреп');
    } finally {
      if (mountedRef.current) {
        setBusyPostId(null);
      }
    }
  };

  const publishPost = async (post: ChannelPost) => {
    if (!channelId || !isModerator || busyPostId !== null) {
      return;
    }
    setBusyPostId(post.ID);
    try {
      await channelService.publishPost(channelId, post.ID);
      await loadData(true);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось опубликовать пост');
    } finally {
      if (mountedRef.current) {
        setBusyPostId(null);
      }
    }
  };

  const roleLabel = useMemo(() => {
    if (!viewerRole) {
      return 'Читатель';
    }
    if (viewerRole === 'owner') {
      return 'Owner';
    }
    if (viewerRole === 'admin') {
      return 'Admin';
    }
    return 'Editor';
  }, [viewerRole]);

  const renderPost = ({ item }: { item: ChannelPost }) => {
    const ctaLabel = getChannelPostCtaLabel(item);
    const postDate = item.publishedAt || item.scheduledAt || item.CreatedAt;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postMetaRow}>
            {item.isPinned ? (
              <View style={styles.pinTag}>
                <Pin size={12} color={colors.accent} />
                <Text style={styles.pinTagText}>Закреп</Text>
              </View>
            ) : null}
            <Text style={styles.postStatus}>{item.status}</Text>
          </View>
          <Text style={styles.postDate}>{new Date(postDate).toLocaleString('ru-RU')}</Text>
        </View>

        <Text style={styles.postContent}>{item.content || 'Без текста'}</Text>

        <View style={styles.postActions}>
          {ctaLabel ? (
            <TouchableOpacity style={styles.primaryAction} onPress={() => handleChannelPostCta(navigation, item)}>
              <Text style={styles.primaryActionText}>{ctaLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <View style={styles.moderationActions}>
            {isModerator && item.status === 'published' ? (
              <TouchableOpacity style={styles.secondaryAction} onPress={() => togglePin(item)}>
                <Text style={styles.secondaryActionText}>{item.isPinned ? 'Открепить' : 'Закрепить'}</Text>
              </TouchableOpacity>
            ) : null}
            {isModerator && item.status !== 'published' ? (
              <TouchableOpacity style={styles.secondaryAction} onPress={() => publishPost(item)}>
                <Text style={styles.secondaryActionText}>Опубликовать</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !channel) {
    return (
      <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{channel?.title || 'Канал'}</Text>
            <Text style={styles.headerSubtitle}>{roleLabel}</Text>
          </View>
          {isEditor ? (
            <View style={styles.headerActions}>
              {isModerator ? (
                <TouchableOpacity
                  style={[styles.headerButton, styles.manageButton]}
                  onPress={() => navigation.navigate('ChannelManage', { channelId })}
                >
                  <Settings2 size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.headerButton, styles.createPostButton]}
                onPress={() => navigation.navigate('ChannelPostComposer', { channelId })}
              >
                <PlusCircle size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
        </View>

        <View style={styles.channelIntro}>
          <Text style={styles.channelDescription}>{channel?.description || 'Описание канала не заполнено'}</Text>
          <Text style={styles.channelMeta}>@{channel?.slug || 'channel'}</Text>
          {isModerator ? (
            <TouchableOpacity
              style={styles.crmButton}
              onPress={() =>
                navigation.navigate('SellerOrders', {
                  source: 'channel_post',
                  sourceChannelId: channelId,
                })
              }
            >
              <Text style={styles.crmButtonText}>Открыть CRM-заказы канала</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isEditor ? (
          <TouchableOpacity
            style={[styles.draftsToggle, includeDraft && styles.draftsToggleActive]}
            onPress={() => setIncludeDraft(prev => !prev)}
          >
            <Text style={styles.draftsToggleText}>
              {includeDraft ? 'Показываются черновики' : 'Показывать только опубликованные'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {showcases.length > 0 ? (
          <View style={styles.showcasesSection}>
            <View style={styles.showcasesHeaderRow}>
              <Text style={styles.showcasesTitle}>Витрины</Text>
              {showcaseLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>

            {showcases.map(showcase => {
              const isServiceShowcase = (showcase.kind || '').toLowerCase().includes('service');

              if (isServiceShowcase) {
                const services = showcaseServices[showcase.ID] || [];
                return (
                  <View key={showcase.ID} style={styles.showcaseCard}>
                    <View style={styles.showcaseCardHeader}>
                      <Text style={styles.showcaseCardTitle}>{showcase.title}</Text>
                      <Text style={styles.showcaseCardKind}>{showcase.kind}</Text>
                    </View>

                    {services.length > 0 ? (
                      <View style={styles.showcaseItemsList}>
                        {services.map(service => (
                          <TouchableOpacity
                            key={service.id}
                            style={styles.showcaseItemRow}
                            onPress={() => navigation.navigate('ServiceDetail', { serviceId: service.id })}
                          >
                            <Text style={styles.showcaseItemTitle} numberOfLines={1}>
                              {service.title}
                            </Text>
                            <Text style={styles.showcaseItemMeta}>{service.category}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.showcaseEmptyText}>Пока нет доступных услуг в этой витрине</Text>
                    )}
                  </View>
                );
              }

              const products = showcaseProducts[showcase.ID] || [];
              return (
                <View key={showcase.ID} style={styles.showcaseCard}>
                  <View style={styles.showcaseCardHeader}>
                    <Text style={styles.showcaseCardTitle}>{showcase.title}</Text>
                    <Text style={styles.showcaseCardKind}>{showcase.kind}</Text>
                  </View>

                  {products.length > 0 ? (
                    <View style={styles.showcaseItemsList}>
                      {products.map(product => (
                        <TouchableOpacity
                          key={product.ID}
                          style={styles.showcaseItemRow}
                          onPress={() => navigation.navigate('ProductDetails', { productId: product.ID })}
                        >
                          <Text style={styles.showcaseItemTitle} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text style={styles.showcaseItemMeta}>
                            {(product.salePrice ?? product.basePrice)} {product.currency || 'RUB'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.showcaseEmptyText}>Пока нет доступных товаров в этой витрине</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {busyPostId ? (
          <View style={styles.busyIndicator}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        <FlatList
          data={posts}
          keyExtractor={item => item.ID.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Постов пока нет</Text>
              <Text style={styles.emptySubtitle}>Создайте первую публикацию в канале</Text>
            </View>
          }
        />
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
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    createPostButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    manageButton: {
      backgroundColor: colors.surfaceElevated,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerPlaceholder: {
      width: 36,
      height: 36,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    channelIntro: {
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    channelDescription: {
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    channelMeta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    crmButton: {
      marginTop: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    crmButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    draftsToggle: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    draftsToggleActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    draftsToggleText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    showcaseContainer: {
      marginHorizontal: 16,
      marginBottom: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    showcaseChip: {
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    showcaseChipText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    showcasesSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 8,
    },
    showcasesHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    showcasesTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    showcaseCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    showcaseCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    showcaseCardTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    showcaseCardKind: {
      color: colors.textSecondary,
      fontSize: 11,
      textTransform: 'uppercase',
    },
    showcaseItemsList: {
      gap: 6,
    },
    showcaseItemRow: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 8,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    showcaseItemTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    showcaseItemMeta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    showcaseEmptyText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    busyIndicator: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 10,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    postMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pinTag: {
      backgroundColor: colors.accentSoft,
      borderRadius: 7,
      paddingVertical: 4,
      paddingHorizontal: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    pinTagText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
    },
    postStatus: {
      color: colors.textSecondary,
      fontSize: 12,
      textTransform: 'uppercase',
    },
    postDate: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    postContent: {
      color: colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
    },
    postActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    moderationActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    primaryAction: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    primaryActionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    secondaryAction: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryActionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
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
