import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PlayCircle, Radio } from 'lucide-react-native';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { channelService } from '../../../../services/channelService';
import { Channel } from '../../../../types/channel';
import { MediaTrack, multimediaService } from '../../../../services/multimediaService';
import SadhuSangaLayout from './components/SadhuSangaLayout';

export default function SadhuSangaLiveScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [archiveTracks, setArchiveTracks] = useState<MediaTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveJoinLoadingChannelId, setLiveJoinLoadingChannelId] = useState<number | null>(null);

  const openTab = useCallback((tab: 'home' | 'schedule' | 'live' | 'profile') => {
    const tabRouteMap: Record<typeof tab, 'SadhuSangaHub' | 'SadhuSangaSchedule' | 'SadhuSangaLive' | 'SadhuSangaProfile'> = {
      home: 'SadhuSangaHub',
      schedule: 'SadhuSangaSchedule',
      live: 'SadhuSangaLive',
      profile: 'SadhuSangaProfile',
    };
    const targetRoute = tabRouteMap[tab];
    if (targetRoute === 'SadhuSangaLive') {
      return;
    }
    navigation.replace(targetRoute);
  }, [navigation]);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const [channelsResponse, archiveResponse] = await Promise.all([
        channelService.getChannels({ page: 1, limit: 60 }),
        multimediaService.getTracks({ type: 'video', sourceContext: 'sadhu_live_archive', page: 1, limit: 12 }),
      ]);
      setChannels(channelsResponse.channels || []);
      setArchiveTracks(archiveResponse.tracks || []);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || error?.message || 'Не удалось загрузить эфиры');
      setChannels([]);
      setArchiveTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const liveChannels = useMemo(() => {
    return channels
      .filter((channel) => channel.currentLiveSession && (channel.liveStatus === 'live' || channel.liveStatus === 'scheduled'))
      .sort((a, b) => {
        const aPriority = a.liveStatus === 'live' ? 0 : 1;
        const bPriority = b.liveStatus === 'live' ? 0 : 1;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        const aTs = Date.parse(a.currentLiveSession?.startedAt || a.currentLiveSession?.scheduledAt || '');
        const bTs = Date.parse(b.currentLiveSession?.startedAt || b.currentLiveSession?.scheduledAt || '');
        if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
          return bTs - aTs;
        }
        return b.ID - a.ID;
      })
      .slice(0, 5);
  }, [channels]);

  const archiveItems = useMemo(() => {
    if (archiveTracks.length > 0) {
      return archiveTracks.map((track) => {
        const durationSeconds = Number(track.duration) || 0;
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return {
          id: track.ID,
          channelId: 0,
          title: track.title || `Лекция #${track.ID}`,
          subtitle: track.description || 'Лекция из архива',
          image: track.thumbnailUrl || '',
          duration,
          tag: track.language ? `Язык: ${String(track.language).toUpperCase()}` : 'Архив',
          followers: track.viewCount || 0,
          youtubeUrl: track.youtubeUrl || '',
        };
      });
    }

    return channels.slice(0, 8).map((item, index) => ({
      id: item.ID,
      channelId: item.ID,
      title: item.title || `Лекция ${index + 1}`,
      subtitle: item.description || 'Лекция из архива',
      image: item.coverUrl || item.avatarUrl || '',
      duration: index % 2 === 0 ? '1:24:00' : '48:30',
      tag: 'Духовная практика',
      followers: item.followersCount || 0,
      youtubeUrl: '',
    }));
  }, [archiveTracks, channels]);

  const handleJoinLive = useCallback(async (item: Channel) => {
    const session = item.currentLiveSession;
    if (!session || session.status !== 'live') {
      Alert.alert('Эфир', 'Сейчас эфир не активен.');
      return;
    }

    const canJoin = Boolean(user?.ID) && (item.ownerId === user?.ID || Boolean(item.isFollowing));
    if (!canJoin) {
      Alert.alert('Требуется подписка', 'Подпишитесь на проповедника, чтобы смотреть эфир.');
      return;
    }
    if (liveJoinLoadingChannelId === item.ID) {
      return;
    }

    setLiveJoinLoadingChannelId(item.ID);
    try {
      const join = await channelService.joinChannelLive(item.ID, session.id, {
        participantName: user?.spiritualName || user?.karmicName || '',
        metadata: { platform: 'mobile' },
      });
      navigation.navigate('RoomChat', {
        roomId: join.roomId,
        roomName: `${item.title} · Live`,
        autoStartCall: true,
        liveChannelId: item.ID,
        liveId: session.id,
      });
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось подключиться к эфиру');
      void loadChannels();
    } finally {
      setLiveJoinLoadingChannelId(null);
    }
  }, [liveJoinLoadingChannelId, loadChannels, navigation, user?.ID, user?.karmicName, user?.spiritualName]);

  return (
    <SadhuSangaLayout
      colors={colors}
      subtitle="Прямые эфиры и архив"
      activeTab="live"
      onBack={() => navigation.goBack()}
      onNotificationsPress={() => navigation.navigate('SadhuSangaSmartPush')}
      onTabPress={openTab}
    >
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tabPaneWrap}>
            <Text style={styles.tabPaneTitle}>Прямой эфир</Text>

            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : liveChannels.length === 0 ? (
              <Text style={styles.liveEmpty}>Скоро здесь появятся эфиры проповедников</Text>
            ) : (
              <View style={styles.liveList}>
                {liveChannels.map((item) => {
                  const session = item.currentLiveSession!;
                  const isLive = session.status === 'live';
                  const languageCode = String(session.broadcastLanguage || 'ru').trim().toUpperCase();
                  const actionLoading = liveJoinLoadingChannelId === item.ID;
                  return (
                    <View key={`live-${item.ID}-${session.id}`} style={styles.liveCard}>
                      <View style={styles.liveCardRow}>
                        <View style={styles.liveTitleWrap}>
                          <Text style={styles.liveCardTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={[styles.liveBadge, isLive ? styles.liveBadgeActive : styles.liveBadgeScheduled]}>
                            {isLive ? `В эфире • ${languageCode}` : `Запланировано • ${languageCode}`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.liveActionButton,
                            !isLive && styles.liveActionButtonDisabled,
                            actionLoading && styles.liveActionButtonDisabled,
                          ]}
                          disabled={!isLive || actionLoading}
                          onPress={() => void handleJoinLive(item)}
                        >
                          {actionLoading ? (
                            <ActivityIndicator size="small" color={colors.textPrimary} />
                          ) : (
                            <>
                              <Radio size={14} color={colors.textPrimary} />
                              <Text style={styles.liveActionButtonText}>Смотреть эфир</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.liveCardMeta} numberOfLines={1}>{session.title || 'Эфир'}</Text>
                      {(session.startedAt || session.scheduledAt) ? (
                        <Text style={styles.liveCardDate}>
                          {new Date(session.startedAt || session.scheduledAt || '').toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.tabPaneWrap}>
            <Text style={styles.tabPaneTitle}>Архив лекций</Text>
            {archiveItems.length === 0 ? (
              <Text style={styles.liveEmpty}>Архив пока пуст</Text>
            ) : (
              <View style={styles.archiveList}>
                {archiveItems.map((item, index) => (
                  <TouchableOpacity
                    key={`archive-${item.id}-${index}`}
                    style={styles.archiveCard}
                    onPress={() => {
                      if (item.channelId > 0) {
                        navigation.navigate('ChannelDetails', { channelId: item.channelId, source: 'sadhu_sanga' });
                      }
                    }}
                  >
                    <View style={styles.archiveImageWrap}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.archiveImage} />
                      ) : (
                        <View style={styles.archiveImageFallback} />
                      )}
                      <View style={styles.archivePlayButton}>
                        <PlayCircle size={34} color="#FFFFFF" />
                      </View>
                      <Text style={styles.archiveDuration}>{item.duration}</Text>
                    </View>
                    <View style={styles.archiveBody}>
                      <Text style={styles.archiveTitle}>{item.subtitle}</Text>
                      <Text style={styles.archiveSub}>{item.title} · 2 дня назад</Text>
                      <View style={styles.archiveMetaRow}>
                        <Text style={styles.archiveTag}>{item.tag}</Text>
                        <Text style={styles.archiveLikes}>♡ {item.followers}</Text>
                      </View>
                      {item.youtubeUrl ? (
                        <TouchableOpacity
                          style={styles.archiveYoutubeButton}
                          onPress={async () => {
                            try {
                              const supported = await Linking.canOpenURL(item.youtubeUrl);
                              if (!supported) {
                                Alert.alert('YouTube', 'Не удалось открыть ссылку.');
                                return;
                              }
                              await Linking.openURL(item.youtubeUrl);
                            } catch {
                              Alert.alert('YouTube', 'Не удалось открыть ссылку на YouTube.');
                            }
                          }}
                        >
                          <Text style={styles.archiveYoutubeButtonText}>Открыть в YouTube</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
    </SadhuSangaLayout>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) => StyleSheet.create({
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 110,
    gap: 10,
  },
  tabPaneWrap: {
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  tabPaneTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
  loaderWrap: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveEmpty: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  liveList: {
    gap: 8,
  },
  liveCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: 9,
    gap: 6,
  },
  liveCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  liveTitleWrap: {
    flex: 1,
    gap: 3,
  },
  liveCardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  liveBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  liveBadgeActive: {
    color: colors.accent,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  liveBadgeScheduled: {
    color: colors.textSecondary,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  liveActionButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveActionButtonDisabled: {
    opacity: 0.55,
  },
  liveActionButtonText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  liveCardMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  liveCardDate: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  archiveList: {
    gap: 10,
  },
  archiveCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  archiveImageWrap: {
    height: 160,
    backgroundColor: colors.surface,
  },
  archiveImage: {
    width: '100%',
    height: '100%',
  },
  archiveImageFallback: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  archivePlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,170,140,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveDuration: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.78)',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  archiveBody: {
    padding: 12,
    gap: 6,
  },
  archiveTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  archiveSub: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  archiveMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  archiveYoutubeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  archiveYoutubeButtonText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  archiveTag: {
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  archiveLikes: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
