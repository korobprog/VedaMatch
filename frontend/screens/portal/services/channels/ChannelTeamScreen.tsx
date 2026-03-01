import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Shield, UserPlus, Users } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel, ChannelMemberResponse, ChannelMemberRole } from '../../../../types/channel';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { contactService, UserContact } from '../../../../services/contactService';

type RouteParams = {
  ChannelTeam: {
    channelId: number;
    source?: 'sadhu_sanga';
  };
};

const toPositiveInt = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  const intVal = Math.floor(parsed);
  return intVal > 0 ? intVal : 0;
};

const roleLabel = (role: ChannelMemberRole): string => {
  switch (role) {
    case 'owner':
      return 'Владелец';
    case 'admin':
      return 'Администратор';
    case 'editor':
      return 'Редактор';
    case 'subscriber':
      return 'Подписчик';
    default:
      return role;
  }
};

const roleRank = (role: ChannelMemberRole): number => {
  switch (role) {
    case 'owner':
      return 0;
    case 'admin':
      return 1;
    case 'editor':
      return 2;
    case 'subscriber':
      return 3;
    default:
      return 4;
  }
};

const getDisplayName = (member: ChannelMemberResponse): string =>
  member.userInfo?.spiritualName || member.userInfo?.karmicName || `User #${member.userId}`;

const getDisplayNickname = (raw?: string): string => {
  const nickname = (raw || '').trim();
  if (!nickname) {
    return '';
  }
  return nickname.startsWith('@') ? nickname : `@${nickname}`;
};

const getInitials = (label: string): string => {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return 'U';
  }
  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }
  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
};

export default function ChannelTeamScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ChannelTeam'>>();
  const channelId = route.params?.channelId;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewerRole, setViewerRole] = useState<ChannelMemberRole | undefined>(undefined);
  const [members, setMembers] = useState<ChannelMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [memberUserIdInput, setMemberUserIdInput] = useState('');
  const [memberRoleInput, setMemberRoleInput] = useState<ChannelMemberRole>('editor');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const mountedRef = useRef(true);
  const latestLoadRef = useRef(0);
  const latestContactsRequestRef = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestLoadRef.current += 1;
      latestContactsRequestRef.current += 1;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, []);

  const canViewTeam = viewerRole === 'owner' || viewerRole === 'admin' || viewerRole === 'editor';
  const canManageTeam = viewerRole === 'owner';
  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        const rankDiff = roleRank(a.role) - roleRank(b.role);
        if (rankDiff !== 0) {
          return rankDiff;
        }
        const aName = getDisplayName(a).toLowerCase();
        const bName = getDisplayName(b).toLowerCase();
        return aName.localeCompare(bName, 'ru');
      }),
    [members]
  );

  const existingMemberIds = useMemo(() => new Set(members.map(item => item.userId)), [members]);

  const memberSearchResults = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q || !canManageTeam) {
      return [];
    }
    return contacts
      .filter(contact => !existingMemberIds.has(contact.ID))
      .filter(contact => {
        const karmic = (contact.karmicName || '').toLowerCase();
        const spiritual = (contact.spiritualName || '').toLowerCase();
        const nickname = (contact.nickname || '').toLowerCase();
        const email = (contact.email || '').toLowerCase();
        return karmic.includes(q) || spiritual.includes(q) || nickname.includes(q) || email.includes(q) || String(contact.ID) === q;
      })
      .slice(0, 8);
  }, [canManageTeam, contacts, existingMemberIds, memberSearchQuery]);

  const loadContactsForSearch = useCallback(async (query: string) => {
    if (!canManageTeam) {
      return;
    }
    const normalized = query.trim();
    if (normalized.length < 2) {
      if (mountedRef.current) {
        setContacts([]);
        setLoadingContacts(false);
      }
      return;
    }

    const requestId = ++latestContactsRequestRef.current;
    setLoadingContacts(true);
    try {
      const response = await contactService.getContactsPage({
        q: normalized,
        limit: 20,
      });
      if (mountedRef.current && requestId === latestContactsRequestRef.current) {
        setContacts(response.items || []);
      }
    } catch {
      if (mountedRef.current && requestId === latestContactsRequestRef.current) {
        setContacts([]);
      }
    } finally {
      if (mountedRef.current && requestId === latestContactsRequestRef.current) {
        setLoadingContacts(false);
      }
    }
  }, [canManageTeam]);

  const loadData = useCallback(async (isRefresh: boolean) => {
    if (!channelId) {
      return;
    }

    const reqId = ++latestLoadRef.current;
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const channelResponse = await channelService.getChannel(channelId);
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }

      const resolvedViewerRole = channelResponse.viewerRole || (channelResponse.channel.ownerId === user?.ID ? 'owner' : undefined);
      setChannel(channelResponse.channel);
      setViewerRole(resolvedViewerRole);

      if (!(resolvedViewerRole === 'owner' || resolvedViewerRole === 'admin' || resolvedViewerRole === 'editor')) {
        setMembers([]);
        Alert.alert('Доступ ограничен', 'У вас нет прав для просмотра команды канала.');
        return;
      }

      const membersResponse = await channelService.listMembers(channelId);
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      setMembers(membersResponse.members || []);
    } catch (error: any) {
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось загрузить команду канала');
      setMembers([]);
    } finally {
      if (mountedRef.current && reqId === latestLoadRef.current) {
        setLoading(false);
      }
    }
  }, [channelId, user?.ID]);

  useFocusEffect(
    useCallback(() => {
      void loadData(false);
    }, [loadData])
  );

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    const normalized = memberSearchQuery.trim();
    if (normalized.length < 2) {
      latestContactsRequestRef.current += 1;
      setLoadingContacts(false);
      setContacts([]);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void loadContactsForSearch(normalized);
    }, 220);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [loadContactsForSearch, memberSearchQuery]);

  const addMember = useCallback(async () => {
    if (!channelId || !canManageTeam) {
      return;
    }
    const userId = toPositiveInt(memberUserIdInput.trim());
    const nicknameCandidate = memberUserIdInput.trim().startsWith('@') || /[a-zA-Z_.]/.test(memberUserIdInput.trim())
      ? memberUserIdInput.trim()
      : '';
    if (userId <= 0 && !nicknameCandidate) {
      Alert.alert('Ошибка', 'Введите корректный userId или @nickname');
      return;
    }
    if (memberRoleInput === 'owner') {
      Alert.alert('Ошибка', 'Роль owner нельзя назначить через добавление');
      return;
    }

    setBusyAction('add');
    try {
      await channelService.addMember(channelId, {
        userId: userId > 0 ? userId : undefined,
        nickname: userId > 0 ? undefined : nicknameCandidate,
        role: memberRoleInput,
      });
      setMemberUserIdInput('');
      setMemberSearchQuery('');
      await loadData(true);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось добавить участника');
    } finally {
      if (mountedRef.current) {
        setBusyAction('');
      }
    }
  }, [canManageTeam, channelId, loadData, memberRoleInput, memberUserIdInput]);

  const toggleMemberRole = useCallback(async (member: ChannelMemberResponse) => {
    if (!channelId || !canManageTeam || member.role === 'owner') {
      return;
    }

    const nextRole: ChannelMemberRole = member.role === 'admin' ? 'editor' : 'admin';
    setBusyAction(`role-${member.userId}`);
    try {
      await channelService.updateMemberRole(channelId, member.userId, nextRole);
      await loadData(true);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить роль');
    } finally {
      if (mountedRef.current) {
        setBusyAction('');
      }
    }
  }, [canManageTeam, channelId, loadData]);

  const removeMember = useCallback((member: ChannelMemberResponse) => {
    if (!channelId || !canManageTeam || member.role === 'owner' || member.userId === channel?.ownerId) {
      return;
    }

    Alert.alert('Удалить участника?', `ID ${member.userId}`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setBusyAction(`remove-${member.userId}`);
          try {
            await channelService.removeMember(channelId, member.userId);
            await loadData(true);
          } catch (error: any) {
            Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось удалить участника');
          } finally {
            if (mountedRef.current) {
              setBusyAction('');
            }
          }
        },
      },
    ]);
  }, [canManageTeam, channel?.ownerId, channelId, loadData]);

  if (loading) {
    return (
      <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
        <View style={styles.loaderWrap}>
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
            <Text style={styles.headerTitle}>Команда канала</Text>
            <Text style={styles.headerSubtitle}>{channel?.title || 'Канал'}</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Users size={16} color={colors.accent} />
              <Text style={styles.infoTitle}>Участники: {members.length}</Text>
            </View>
            <Text style={styles.infoMeta}>
              owner: {members.filter(item => item.role === 'owner').length} · admin: {members.filter(item => item.role === 'admin').length} · editor: {members.filter(item => item.role === 'editor').length}
            </Text>
            <Text style={styles.infoText}>
              {canManageTeam
                ? 'Вы можете добавлять участников, менять роли admin/editor и удалять из команды.'
                : 'У вас доступ только к просмотру состава команды.'}
            </Text>
          </View>

          {!canViewTeam ? (
            <View style={styles.deniedCard}>
              <Text style={styles.deniedText}>Нет прав для просмотра команды канала.</Text>
            </View>
          ) : null}

          {canManageTeam ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <UserPlus size={16} color={colors.textPrimary} />
                <Text style={styles.sectionTitle}>Добавить участника</Text>
              </View>

              <TextInput
                value={memberUserIdInput}
                onChangeText={setMemberUserIdInput}
                placeholder="User ID или @nickname"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />

              <TextInput
                value={memberSearchQuery}
                onChangeText={setMemberSearchQuery}
                placeholder="Поиск по имени, @nickname, email или ID"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />

              {loadingContacts ? (
                <View style={styles.inlineLoader}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : null}

              {memberSearchResults.length > 0 ? (
                <View style={styles.searchList}>
                  {memberSearchResults.map(contact => (
                    <TouchableOpacity
                      key={contact.ID}
                      style={styles.searchItem}
                      onPress={() => {
                        setMemberUserIdInput(contact.nickname ? `@${contact.nickname}` : String(contact.ID));
                        setMemberSearchQuery(contact.spiritualName || contact.karmicName || contact.nicknameDisplay || contact.email || String(contact.ID));
                      }}
                    >
                      <Text style={styles.searchName} numberOfLines={1}>
                        {contact.spiritualName || contact.karmicName || `User #${contact.ID}`}
                      </Text>
                      <Text style={styles.searchMeta} numberOfLines={1}>
                        {getDisplayNickname(contact.nicknameDisplay || contact.nickname) || `ID ${contact.ID}`} · {contact.email || 'без email'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <View style={styles.roleSwitchRow}>
                <TouchableOpacity
                  style={[styles.roleSwitchButton, memberRoleInput === 'editor' && styles.roleSwitchButtonActive]}
                  onPress={() => setMemberRoleInput('editor')}
                >
                  <Text style={styles.roleSwitchButtonText}>editor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleSwitchButton, memberRoleInput === 'admin' && styles.roleSwitchButtonActive]}
                  onPress={() => setMemberRoleInput('admin')}
                >
                  <Text style={styles.roleSwitchButtonText}>admin</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={() => void addMember()} disabled={busyAction === 'add'}>
                {busyAction === 'add' ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>Добавить в команду</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color={colors.textPrimary} />
              <Text style={styles.sectionTitle}>Состав команды</Text>
            </View>

            {members.length === 0 ? (
              <Text style={styles.emptyText}>Пока нет участников.</Text>
            ) : (
              <View style={styles.memberList}>
                {sortedMembers.map(member => {
                  const isOwnerRow = member.role === 'owner' || member.userId === channel?.ownerId;
                  const roleBusy = busyAction === `role-${member.userId}`;
                  const removeBusy = busyAction === `remove-${member.userId}`;
                  const displayName = getDisplayName(member);
                  const avatarUrl = member.userInfo?.avatarUrl;
                  return (
                    <View key={`${member.channelId}-${member.userId}`} style={styles.memberCard}>
                      <View style={styles.memberTopRow}>
                        <View style={styles.memberAvatarWrap}>
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.memberAvatarImage} />
                          ) : (
                            <Text style={styles.memberAvatarInitials}>{getInitials(displayName)}</Text>
                          )}
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {displayName}
                          </Text>
                          <Text style={styles.memberMeta} numberOfLines={1}>
                            {getDisplayNickname(member.userInfo?.nicknameDisplay || member.userInfo?.nickname) || `ID ${member.userId}`}
                          </Text>
                        </View>
                        <View style={styles.memberRoleBadge}>
                          <Text style={styles.memberRoleText}>{roleLabel(member.role)}</Text>
                        </View>
                      </View>

                      {canManageTeam && !isOwnerRow ? (
                        <View style={styles.memberActionsRow}>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => void toggleMemberRole(member)}
                            disabled={roleBusy || removeBusy}
                          >
                            {roleBusy ? (
                              <ActivityIndicator size="small" color={colors.textPrimary} />
                            ) : (
                              <Text style={styles.secondaryButtonText}>
                                {member.role === 'admin' ? 'Сделать editor' : 'Сделать admin'}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.secondaryButton, styles.deleteButton]}
                            onPress={() => removeMember(member)}
                            disabled={roleBusy || removeBusy}
                          >
                            {removeBusy ? (
                              <ActivityIndicator size="small" color={colors.textPrimary} />
                            ) : (
                              <Text style={styles.deleteButtonText}>Удалить</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
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
    loaderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '900',
    },
    headerSubtitle: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    headerPlaceholder: {
      width: 42,
      height: 42,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 28,
      gap: 12,
    },
    infoCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 6,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    infoText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    infoMeta: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    deniedCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
    },
    deniedText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700',
    },
    sectionCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    input: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    inlineLoader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    searchList: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    searchItem: {
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 2,
    },
    searchName: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    searchMeta: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    roleSwitchRow: {
      flexDirection: 'row',
      gap: 8,
    },
    roleSwitchButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleSwitchButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    roleSwitchButtonText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    primaryButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 42,
    },
    primaryButtonText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    memberList: {
      gap: 8,
    },
    memberCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      gap: 8,
    },
    memberTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    memberAvatarWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    memberAvatarImage: {
      width: '100%',
      height: '100%',
    },
    memberAvatarInitials: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    memberInfo: {
      flex: 1,
      gap: 2,
    },
    memberName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    memberMeta: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    memberRoleBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    memberRoleText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    memberActionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      paddingHorizontal: 8,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    deleteButton: {
      borderColor: colors.danger,
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      flex: 0,
      minWidth: 88,
    },
    deleteButtonText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '800',
    },
  });
