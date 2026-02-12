import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel, ChannelMemberResponse, ChannelMemberRole, ChannelShowcase } from '../../../../types/channel';
import { ProductCategoryConfig } from '../../../../types/market';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { contactService, UserContact } from '../../../../services/contactService';
import { marketService } from '../../../../services/marketService';
import { CATEGORY_LABELS } from '../../../../services/serviceService';

type RouteParams = {
  ChannelManage: {
    channelId: number;
  };
};

const DEFAULT_SHOWCASE_KIND = 'manual_products';
const SHOWCASE_KIND_PRESETS = [
  { value: 'manual_products', label: 'Ручной список товаров' },
  { value: 'products_by_category', label: 'Товары по категории' },
  { value: 'manual_services', label: 'Ручной список услуг' },
  { value: 'services_by_category', label: 'Услуги по категории' },
] as const;

type ShowcaseFilterMode = 'builder' | 'json';

const toIntOrZero = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.floor(parsed);
};

const parseIDsList = (value: string) =>
  value
    .split(',')
    .map(item => toIntOrZero(item.trim()))
    .filter(item => item > 0);

export default function ChannelManageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ChannelManage'>>();
  const channelId = route.params?.channelId;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingShowcase, setCreatingShowcase] = useState(false);
  const [memberActionBusy, setMemberActionBusy] = useState<string>('');
  const [showcaseReorderBusy, setShowcaseReorderBusy] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingProductCategories, setLoadingProductCategories] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewerRole, setViewerRole] = useState<ChannelMemberRole | undefined>(undefined);
  const [members, setMembers] = useState<ChannelMemberResponse[]>([]);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [showcases, setShowcases] = useState<ChannelShowcase[]>([]);
  const [productCategoryOptions, setProductCategoryOptions] = useState<ProductCategoryConfig[]>([]);
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [timezone, setTimezone] = useState('UTC');

  const [showcaseTitle, setShowcaseTitle] = useState('');
  const [showcaseKind, setShowcaseKind] = useState(DEFAULT_SHOWCASE_KIND);
  const [showcaseFilterMode, setShowcaseFilterMode] = useState<ShowcaseFilterMode>('builder');
  const [showcaseFilterJson, setShowcaseFilterJson] = useState('');
  const [showcaseFilterCategory, setShowcaseFilterCategory] = useState('');
  const [showcaseFilterShopID, setShowcaseFilterShopID] = useState('');
  const [showcaseFilterProductIDs, setShowcaseFilterProductIDs] = useState('');
  const [showcaseFilterServiceIDs, setShowcaseFilterServiceIDs] = useState('');
  const [showcaseFilterLimit, setShowcaseFilterLimit] = useState('');
  const [showcasePosition, setShowcasePosition] = useState('0');
  const [memberUserIdInput, setMemberUserIdInput] = useState('');
  const [memberRoleInput, setMemberRoleInput] = useState<ChannelMemberRole>('editor');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const mountedRef = useRef(true);
  const latestLoadRef = useRef(0);
  const isOwner = viewerRole === 'owner';
  const canManageShowcases = viewerRole === 'owner' || viewerRole === 'admin';
  const canManageMembers = viewerRole === 'owner';
  const orderedShowcases = useMemo(
    () => [...showcases].sort((a, b) => a.position - b.position || a.ID - b.ID),
    [showcases]
  );
  const isServiceShowcaseKind = showcaseKind.toLowerCase().includes('service');
  const serviceCategoryOptions = useMemo(
    () =>
      Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );
  const categoryQuickOptions = useMemo(() => {
    if (isServiceShowcaseKind) {
      return serviceCategoryOptions;
    }
    return productCategoryOptions.map(item => ({
      value: item.id,
      label: `${item.emoji || ''} ${item.label?.ru || item.id}`.trim(),
    }));
  }, [isServiceShowcaseKind, serviceCategoryOptions, productCategoryOptions]);
  const builtShowcaseFilterJson = useMemo(() => {
    const payload: Record<string, any> = {};
    const category = showcaseFilterCategory.trim();
    const shopId = toIntOrZero(showcaseFilterShopID.trim());
    const limit = toIntOrZero(showcaseFilterLimit.trim());
    const productIDs = parseIDsList(showcaseFilterProductIDs);
    const serviceIDs = parseIDsList(showcaseFilterServiceIDs);

    if (category) {
      payload.category = category;
    }
    if (shopId > 0) {
      payload.shopId = shopId;
    }
    if (productIDs.length > 0) {
      payload.productIds = productIDs;
    }
    if (serviceIDs.length > 0) {
      payload.serviceIds = serviceIDs;
    }
    if (limit > 0) {
      payload.limit = limit;
    }

    if (Object.keys(payload).length === 0) {
      return '';
    }
    return JSON.stringify(payload);
  }, [
    showcaseFilterCategory,
    showcaseFilterShopID,
    showcaseFilterLimit,
    showcaseFilterProductIDs,
    showcaseFilterServiceIDs,
  ]);
  const existingMemberIds = useMemo(() => new Set(members.map(member => member.userId)), [members]);
  const memberSearchResults = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q || !canManageMembers) {
      return [];
    }
    return contacts
      .filter(contact => !existingMemberIds.has(contact.ID))
      .filter(contact => {
        const karmic = (contact.karmicName || '').toLowerCase();
        const spiritual = (contact.spiritualName || '').toLowerCase();
        const email = (contact.email || '').toLowerCase();
        return karmic.includes(q) || spiritual.includes(q) || email.includes(q) || contact.ID.toString() === q;
      })
      .slice(0, 8);
  }, [memberSearchQuery, contacts, existingMemberIds, canManageMembers]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestLoadRef.current += 1;
    };
  }, []);

  const loadMembers = useCallback(async (targetChannelID: number) => {
    try {
      const membersResponse = await channelService.listMembers(targetChannelID);
      if (mountedRef.current) {
        setMembers(membersResponse.members || []);
      }
    } catch {
      if (mountedRef.current) {
        setMembers([]);
      }
    }
  }, []);

  const loadContactsForMemberSearch = useCallback(async () => {
    if (!canManageMembers || loadingContacts || contacts.length > 0) {
      return;
    }
    setLoadingContacts(true);
    try {
      const items = await contactService.getContacts();
      if (mountedRef.current) {
        setContacts(items || []);
      }
    } catch {
      if (mountedRef.current) {
        setContacts([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingContacts(false);
      }
    }
  }, [canManageMembers, loadingContacts, contacts.length]);

  const loadProductCategories = useCallback(async () => {
    if (!canManageShowcases || loadingProductCategories || productCategoryOptions.length > 0) {
      return;
    }
    setLoadingProductCategories(true);
    try {
      const categories = await marketService.getProductCategories();
      if (mountedRef.current) {
        setProductCategoryOptions(categories || []);
      }
    } catch {
      if (mountedRef.current) {
        setProductCategoryOptions([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingProductCategories(false);
      }
    }
  }, [canManageShowcases, loadingProductCategories, productCategoryOptions.length]);

  const load = useCallback(async () => {
    if (!channelId) {
      return;
    }

    const reqId = ++latestLoadRef.current;
    setLoading(true);
    try {
      const [channelResponse, showcasesResponse] = await Promise.all([
        channelService.getChannel(channelId),
        channelService.listShowcases(channelId),
      ]);
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }

      const fetchedChannel = channelResponse.channel;
      const fetchedRole = channelResponse.viewerRole;
      setChannel(fetchedChannel);
      setViewerRole(fetchedRole);
      setShowcases(showcasesResponse.showcases || []);
      setDescription(fetchedChannel.description || '');
      setAvatarUrl(fetchedChannel.avatarUrl || '');
      setCoverUrl(fetchedChannel.coverUrl || '');
      setIsPublic(fetchedChannel.isPublic);
      setTimezone(fetchedChannel.timezone || 'UTC');

      if (fetchedRole === 'owner' || fetchedRole === 'admin') {
        if (mountedRef.current && reqId === latestLoadRef.current) {
          await loadMembers(channelId);
        }
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось загрузить настройки канала');
    } finally {
      if (mountedRef.current && reqId === latestLoadRef.current) {
        setLoading(false);
      }
    }
  }, [channelId, loadMembers]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (canManageMembers) {
      void loadContactsForMemberSearch();
    }
  }, [canManageMembers, loadContactsForMemberSearch]);

  useEffect(() => {
    if (canManageShowcases) {
      void loadProductCategories();
    }
  }, [canManageShowcases, loadProductCategories]);

  const saveBranding = async () => {
    if (!channelId) {
      return;
    }
    setSavingBranding(true);
    try {
      const updated = await channelService.updateBranding(channelId, {
        description: description.trim(),
        avatarUrl: avatarUrl.trim(),
        coverUrl: coverUrl.trim(),
      });
      setChannel(updated);
      Alert.alert('Готово', 'Брендинг канала обновлен');
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось сохранить брендирование');
    } finally {
      setSavingBranding(false);
    }
  };

  const saveChannelSettings = async () => {
    if (!channelId) {
      return;
    }
    setSavingSettings(true);
    try {
      const updated = await channelService.updateChannel(channelId, {
        isPublic,
        timezone: timezone.trim() || 'UTC',
      });
      setChannel(updated);
      Alert.alert('Готово', 'Настройки канала обновлены');
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось сохранить настройки');
    } finally {
      setSavingSettings(false);
    }
  };

  const createShowcase = async () => {
    if (!channelId) {
      return;
    }

    const title = showcaseTitle.trim();
    if (!title) {
      Alert.alert('Ошибка', 'Введите название витрины');
      return;
    }
    const kind = showcaseKind.trim() || DEFAULT_SHOWCASE_KIND;
    if (showcaseFilterMode === 'builder') {
      if (kind === 'products_by_category' || kind === 'services_by_category') {
        if (!showcaseFilterCategory.trim()) {
          Alert.alert('Ошибка', 'Для витрины по категории укажите category');
          return;
        }
      }
      if (kind === 'manual_products' && parseIDsList(showcaseFilterProductIDs).length === 0) {
        Alert.alert('Ошибка', 'Для manual_products укажите productIds');
        return;
      }
      if (kind === 'manual_services' && parseIDsList(showcaseFilterServiceIDs).length === 0) {
        Alert.alert('Ошибка', 'Для manual_services укажите serviceIds');
        return;
      }
    }

    const filterJson = showcaseFilterMode === 'json'
      ? showcaseFilterJson.trim()
      : builtShowcaseFilterJson;
    if (filterJson) {
      try {
        JSON.parse(filterJson);
      } catch {
        Alert.alert('Ошибка', 'filterJson должен быть валидным JSON');
        return;
      }
    }

    setCreatingShowcase(true);
    try {
      const created = await channelService.createShowcase(channelId, {
        title,
        kind,
        filterJson,
        position: toIntOrZero(showcasePosition),
        isActive: true,
      });
      setShowcases(prev => [...prev, created].sort((a, b) => a.position - b.position));
      setShowcaseTitle('');
      setShowcaseKind(DEFAULT_SHOWCASE_KIND);
      setShowcaseFilterMode('builder');
      setShowcaseFilterJson('');
      setShowcaseFilterCategory('');
      setShowcaseFilterShopID('');
      setShowcaseFilterProductIDs('');
      setShowcaseFilterServiceIDs('');
      setShowcaseFilterLimit('');
      setShowcasePosition('0');
      Alert.alert('Готово', 'Витрина добавлена');
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось создать витрину');
    } finally {
      setCreatingShowcase(false);
    }
  };

  const moveShowcase = async (index: number, direction: -1 | 1) => {
    if (!channelId || showcaseReorderBusy) {
      return;
    }
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedShowcases.length) {
      return;
    }

    const current = orderedShowcases[index];
    const target = orderedShowcases[targetIndex];

    setShowcaseReorderBusy(true);
    try {
      await Promise.all([
        channelService.updateShowcase(channelId, current.ID, { position: target.position }),
        channelService.updateShowcase(channelId, target.ID, { position: current.position }),
      ]);

      const next = [...orderedShowcases];
      next[index] = { ...target, position: current.position };
      next[targetIndex] = { ...current, position: target.position };
      setShowcases(next.sort((a, b) => a.position - b.position || a.ID - b.ID));
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось изменить порядок витрины');
    } finally {
      setShowcaseReorderBusy(false);
    }
  };

  const toggleShowcaseActive = async (item: ChannelShowcase) => {
    if (!channelId) {
      return;
    }
    try {
      const updated = await channelService.updateShowcase(channelId, item.ID, {
        isActive: !item.isActive,
      });
      setShowcases(prev => prev.map(showcase => (showcase.ID === item.ID ? updated : showcase)));
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить витрину');
    }
  };

  const deleteShowcase = async (item: ChannelShowcase) => {
    if (!channelId) {
      return;
    }
    Alert.alert('Удалить витрину?', item.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await channelService.deleteShowcase(channelId, item.ID);
            setShowcases(prev => prev.filter(showcase => showcase.ID !== item.ID));
          } catch (error: any) {
            Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось удалить витрину');
          }
        },
      },
    ]);
  };

  const toggleMemberRole = async (member: ChannelMemberResponse) => {
    if (!channelId || !canManageMembers) {
      return;
    }
    if (member.role === 'owner') {
      return;
    }
    const nextRole: ChannelMemberRole = member.role === 'admin' ? 'editor' : 'admin';
    setMemberActionBusy(`role-${member.userId}`);
    try {
      await channelService.updateMemberRole(channelId, member.userId, nextRole);
      await loadMembers(channelId);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить роль');
    } finally {
      setMemberActionBusy('');
    }
  };

  const removeMember = async (member: ChannelMemberResponse) => {
    if (!channelId || !canManageMembers) {
      return;
    }
    if (member.role === 'owner' || member.userId === channel?.ownerId) {
      return;
    }

    Alert.alert('Удалить участника?', `ID ${member.userId}`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setMemberActionBusy(`remove-${member.userId}`);
          try {
            await channelService.removeMember(channelId, member.userId);
            await loadMembers(channelId);
          } catch (error: any) {
            Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось удалить участника');
          } finally {
            setMemberActionBusy('');
          }
        },
      },
    ]);
  };

  const addMember = async () => {
    if (!channelId || !canManageMembers) {
      return;
    }

    const userId = toIntOrZero(memberUserIdInput.trim());
    if (userId <= 0) {
      Alert.alert('Ошибка', 'Введите корректный userId');
      return;
    }
    if (memberRoleInput === 'owner') {
      Alert.alert('Ошибка', 'Роль owner нельзя назначить через добавление');
      return;
    }

    setMemberActionBusy('add');
    try {
      await channelService.addMember(channelId, { userId, role: memberRoleInput });
      setMemberUserIdInput('');
      setMemberSearchQuery('');
      await loadMembers(channelId);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось добавить участника');
    } finally {
      setMemberActionBusy('');
    }
  };

  if (loading) {
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
          <Text style={styles.headerTitle}>Управление каналом</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Брендирование</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Описание канала"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.textArea]}
            multiline
          />
          <TextInput
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="URL аватарки"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={coverUrl}
            onChangeText={setCoverUrl}
            placeholder="URL обложки"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={saveBranding} disabled={savingBranding}>
            {savingBranding ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.primaryBtnText}>Сохранить брендинг</Text>}
          </TouchableOpacity>

          {isOwner ? (
            <>
              <Text style={styles.sectionTitle}>Доступ канала</Text>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Публичный канал</Text>
                  <Text style={styles.switchSub}>{channel?.isPublic ? 'Виден всем' : 'Только участники'}</Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: colors.border, true: colors.accentSoft }}
                  thumbColor={isPublic ? colors.accent : colors.surfaceElevated}
                />
              </View>
              <TextInput
                value={timezone}
                onChangeText={setTimezone}
                placeholder="UTC"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.secondaryBtn} onPress={saveChannelSettings} disabled={savingSettings}>
                {savingSettings ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.secondaryBtnText}>Сохранить настройки канала</Text>}
              </TouchableOpacity>
            </>
          ) : null}

          {canManageShowcases ? (
            <>
              <Text style={styles.sectionTitle}>Участники канала</Text>
              {canManageMembers ? (
                <View style={styles.memberAddCard}>
                  <TextInput
                    value={memberUserIdInput}
                    onChangeText={setMemberUserIdInput}
                    placeholder="User ID для добавления"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    keyboardType="numeric"
                  />
                  <TextInput
                    value={memberSearchQuery}
                    onChangeText={setMemberSearchQuery}
                    placeholder="Поиск по имени, email или ID"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                  />
                  {loadingContacts ? (
                    <View style={styles.inlineLoader}>
                      <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                  ) : null}
                  {memberSearchResults.length > 0 ? (
                    <View style={styles.searchResultsList}>
                      {memberSearchResults.map(contact => (
                        <TouchableOpacity
                          key={contact.ID}
                          style={styles.searchResultItem}
                          onPress={() => {
                            setMemberUserIdInput(contact.ID.toString());
                            setMemberSearchQuery(contact.spiritualName || contact.karmicName || contact.email || contact.ID.toString());
                          }}
                        >
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>
                              {contact.spiritualName || contact.karmicName || `User #${contact.ID}`}
                            </Text>
                            <Text style={styles.searchResultMeta}>
                              ID {contact.ID} · {contact.email || 'без email'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.memberRolePicker}>
                    <TouchableOpacity
                      style={[styles.memberRoleOption, memberRoleInput === 'editor' && styles.memberRoleOptionActive]}
                      onPress={() => setMemberRoleInput('editor')}
                    >
                      <Text style={styles.memberRoleOptionText}>editor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.memberRoleOption, memberRoleInput === 'admin' && styles.memberRoleOptionActive]}
                      onPress={() => setMemberRoleInput('admin')}
                    >
                      <Text style={styles.memberRoleOptionText}>admin</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.primaryBtn} onPress={addMember} disabled={memberActionBusy === 'add'}>
                    {memberActionBusy === 'add' ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.primaryBtnText}>Добавить участника</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}
              {members.length > 0 ? (
                <View style={styles.membersList}>
                  {members.map(member => (
                    <View key={`${member.channelId}-${member.userId}`} style={styles.memberItem}>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {member.userInfo?.spiritualName || member.userInfo?.karmicName || `User #${member.userId}`}
                        </Text>
                        <Text style={styles.memberMeta}>ID {member.userId}</Text>
                      </View>
                      <View style={styles.memberRoleBadge}>
                        <Text style={styles.memberRoleText}>{member.role}</Text>
                      </View>
                      {canManageMembers && member.role !== 'owner' && member.userId !== channel?.ownerId ? (
                        <View style={styles.memberActions}>
                          <TouchableOpacity
                            style={styles.memberRoleSwitchBtn}
                            onPress={() => toggleMemberRole(member)}
                            disabled={memberActionBusy === `role-${member.userId}`}
                          >
                            {memberActionBusy === `role-${member.userId}` ? (
                              <ActivityIndicator size="small" color={colors.textPrimary} />
                            ) : (
                              <Text style={styles.memberRoleSwitchText}>
                                {member.role === 'admin' ? 'В editor' : 'В admin'}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => removeMember(member)}>
                            <Trash2 size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.readOnlyCard}>
                  <Text style={styles.readOnlyText}>Участников пока нет</Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Витрины канала</Text>
              <TextInput
                value={showcaseTitle}
                onChangeText={setShowcaseTitle}
                placeholder="Название витрины"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Тип витрины</Text>
              <View style={styles.showcaseKindPicker}>
                {SHOWCASE_KIND_PRESETS.map(item => (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.showcaseKindOption, showcaseKind === item.value && styles.showcaseKindOptionActive]}
                    onPress={() => setShowcaseKind(item.value)}
                  >
                    <Text style={styles.showcaseKindOptionText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={showcaseKind}
                onChangeText={setShowcaseKind}
                placeholder="или свой kind (например custom_window)"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Режим фильтра</Text>
              <View style={styles.filterModePicker}>
                <TouchableOpacity
                  style={[styles.filterModeOption, showcaseFilterMode === 'builder' && styles.filterModeOptionActive]}
                  onPress={() => setShowcaseFilterMode('builder')}
                >
                  <Text style={styles.filterModeOptionText}>Конструктор</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterModeOption, showcaseFilterMode === 'json' && styles.filterModeOptionActive]}
                  onPress={() => setShowcaseFilterMode('json')}
                >
                  <Text style={styles.filterModeOptionText}>JSON</Text>
                </TouchableOpacity>
              </View>
              {showcaseFilterMode === 'builder' ? (
                <View style={styles.filterBuilderCard}>
                  <TextInput
                    value={showcaseFilterCategory}
                    onChangeText={setShowcaseFilterCategory}
                    placeholder="category (например books / yagya)"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                  />
                  {loadingProductCategories && !isServiceShowcaseKind ? (
                    <View style={styles.inlineLoader}>
                      <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                  ) : null}
                  {categoryQuickOptions.length > 0 ? (
                    <View style={styles.categoryOptionsRow}>
                      {categoryQuickOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.categoryOption, showcaseFilterCategory === option.value && styles.categoryOptionActive]}
                          onPress={() => setShowcaseFilterCategory(option.value)}
                        >
                          <Text style={styles.categoryOptionText}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  <TextInput
                    value={showcaseFilterShopID}
                    onChangeText={setShowcaseFilterShopID}
                    placeholder="shopId (опционально)"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    keyboardType="numeric"
                  />
                  {isServiceShowcaseKind ? (
                    <TextInput
                      value={showcaseFilterServiceIDs}
                      onChangeText={setShowcaseFilterServiceIDs}
                      placeholder="serviceIds через запятую, например 10,11,12"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.input}
                    />
                  ) : (
                    <TextInput
                      value={showcaseFilterProductIDs}
                      onChangeText={setShowcaseFilterProductIDs}
                      placeholder="productIds через запятую, например 1,2,3"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.input}
                    />
                  )}
                  <TextInput
                    value={showcaseFilterLimit}
                    onChangeText={setShowcaseFilterLimit}
                    placeholder="limit (опционально)"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    keyboardType="numeric"
                  />
                  <View style={styles.filterPreviewCard}>
                    <Text style={styles.filterPreviewTitle}>Собранный filterJson</Text>
                    <Text style={styles.filterPreviewValue}>
                      {builtShowcaseFilterJson || '{}'}
                    </Text>
                  </View>
                </View>
              ) : (
                <TextInput
                  value={showcaseFilterJson}
                  onChangeText={setShowcaseFilterJson}
                  placeholder='filterJson, например {"category":"books"}'
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.textArea]}
                  multiline
                />
              )}
              <TextInput
                value={showcasePosition}
                onChangeText={setShowcasePosition}
                placeholder="Позиция"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={createShowcase} disabled={creatingShowcase}>
                {creatingShowcase ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.primaryBtnText}>Добавить витрину</Text>}
              </TouchableOpacity>

              <View style={styles.showcaseList}>
                {orderedShowcases.map((item, index) => (
                  <View key={item.ID} style={styles.showcaseItem}>
                    <View style={styles.showcaseInfo}>
                      <Text style={styles.showcaseTitle}>{item.title}</Text>
                      <Text style={styles.showcaseMeta}>{item.kind} · position {item.position}</Text>
                    </View>
                    <View style={styles.showcaseActions}>
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => moveShowcase(index, -1)}
                        disabled={showcaseReorderBusy || index === 0}
                      >
                        <ChevronUp size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => moveShowcase(index, 1)}
                        disabled={showcaseReorderBusy || index === orderedShowcases.length - 1}
                      >
                        <ChevronDown size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.showcaseToggle} onPress={() => toggleShowcaseActive(item)}>
                        <Text style={styles.showcaseToggleText}>{item.isActive ? 'Активна' : 'Скрыта'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteShowcase(item)}>
                        <Trash2 size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyText}>Недостаточно прав для управления витринами канала</Text>
            </View>
          )}
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
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    headerPlaceholder: {
      width: 36,
      height: 36,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 30,
      gap: 10,
    },
    sectionTitle: {
      marginTop: 8,
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
      marginBottom: -2,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    textArea: {
      minHeight: 90,
      textAlignVertical: 'top',
    },
    primaryBtn: {
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    primaryBtnText: {
      color: colors.textPrimary,
      fontWeight: '800',
      fontSize: 14,
    },
    secondaryBtn: {
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    switchRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    switchTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    switchSub: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 3,
    },
    showcaseKindPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    showcaseKindOption: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    showcaseKindOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    showcaseKindOptionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    filterModePicker: {
      flexDirection: 'row',
      gap: 8,
    },
    filterModeOption: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      paddingVertical: 9,
    },
    filterModeOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    filterModeOptionText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    filterBuilderCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    categoryOptionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryOption: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    categoryOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    categoryOptionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    filterPreviewCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    filterPreviewTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    filterPreviewValue: {
      color: colors.textPrimary,
      fontSize: 12,
    },
    showcaseList: {
      gap: 8,
      marginTop: 4,
    },
    memberAddCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    memberRolePicker: {
      flexDirection: 'row',
      gap: 8,
    },
    inlineLoader: {
      alignItems: 'center',
      paddingVertical: 2,
    },
    searchResultsList: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    searchResultItem: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchResultInfo: {
      gap: 2,
    },
    searchResultName: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    searchResultMeta: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    memberRoleOption: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      paddingVertical: 9,
    },
    memberRoleOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    memberRoleOptionText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    membersList: {
      gap: 8,
      marginTop: 4,
      marginBottom: 4,
    },
    memberItem: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    memberMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    memberRoleBadge: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    memberActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    memberRoleSwitchBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 82,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberRoleSwitchText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    memberRoleText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    showcaseItem: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    showcaseInfo: {
      flex: 1,
    },
    showcaseTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    showcaseMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 3,
    },
    showcaseActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    reorderBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    showcaseToggle: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    showcaseToggleText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    readOnlyCard: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
    },
    readOnlyText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
  });
