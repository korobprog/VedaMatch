import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Check, Plus, Trash2, Video } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { channelService } from '../../../../services/channelService';
import { VideoCircle, videoCirclesService } from '../../../../services/videoCirclesService';
import {
  ChannelPost,
  ChannelPostCTAType,
  ChannelPostMedia,
  ChannelPostMediaCircle,
  ChannelPostMediaImage,
} from '../../../../types/channel';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { KeyboardAwareContainer } from '../../../../components/ui/KeyboardAwareContainer';

type RouteParams = {
  ChannelPostComposer: {
    channelId: number;
    mode?: 'create' | 'edit';
    postId?: number;
    initialPost?: ChannelPost;
  };
};

type PublishAction = 'draft' | 'publish' | 'schedule';

const CTA_TYPES: ChannelPostCTAType[] = ['none', 'order_products', 'book_service'];

const MAX_POST_IMAGES = 5;
const MAX_POST_CIRCLES = 10;
const IMAGE_MIME_FALLBACK: ChannelPostMediaImage['mimeType'] = 'image/jpeg';

const buildDefaultSchedule = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  return date.toISOString();
};

const buildPresetDate = (mode: 'plus1h' | 'plus3h' | 'tomorrow0900' | 'tomorrow1800') => {
  const now = new Date();
  if (mode === 'plus1h') {
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
  if (mode === 'plus3h') {
    return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setSeconds(0);
  tomorrow.setMilliseconds(0);
  if (mode === 'tomorrow0900') {
    tomorrow.setHours(9, 0, 0, 0);
  } else {
    tomorrow.setHours(18, 0, 0, 0);
  }
  return tomorrow.toISOString();
};

const normalizeImageMime = (raw?: string): ChannelPostMediaImage['mimeType'] => {
  const normalized = String(raw || '').trim().toLowerCase();
  if (normalized === 'image/png') return 'image/png';
  if (normalized === 'image/webp') return 'image/webp';
  return IMAGE_MIME_FALLBACK;
};

const parsePostMedia = (raw: string): ChannelPostMedia => {
  const fallback: ChannelPostMedia = { images: [], circles: [] };
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed) as ChannelPostMedia;
    const images = Array.isArray(parsed?.images) ? parsed.images : [];
    const circles = Array.isArray(parsed?.circles) ? parsed.circles : [];
    return {
      images: images
        .filter(item => item && item.url)
        .map(item => ({
          url: String(item.url).trim(),
          width: Number(item.width) > 0 ? Number(item.width) : 1080,
          height: Number(item.height) > 0 ? Number(item.height) : 1350,
          mimeType: normalizeImageMime(item.mimeType),
        }))
        .slice(0, MAX_POST_IMAGES),
      circles: circles
        .filter(item => item && Number(item.id) > 0 && item.mediaUrl)
        .map(item => ({
          id: Number(item.id),
          mediaUrl: String(item.mediaUrl).trim(),
          thumbnailUrl: item.thumbnailUrl ? String(item.thumbnailUrl).trim() : undefined,
          durationSec: item.durationSec ? Number(item.durationSec) : undefined,
          expiresAt: item.expiresAt,
        }))
        .slice(0, MAX_POST_CIRCLES),
    };
  } catch {
    console.warn('[ChannelPostComposer] Invalid mediaJson, using fallback');
    return fallback;
  }
};

const toCircleMedia = (circle: VideoCircle): ChannelPostMediaCircle => ({
  id: circle.id,
  mediaUrl: circle.mediaUrl,
  thumbnailUrl: circle.thumbnailUrl,
  durationSec: circle.durationSec,
  expiresAt: circle.expiresAt,
});

export default function ChannelPostComposerScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const route = useRoute<RouteProp<RouteParams, 'ChannelPostComposer'>>();
  const channelId = route.params?.channelId;
  const mode = route.params?.mode === 'edit' ? 'edit' : 'create';
  const postId = route.params?.postId;
  const initialPost = route.params?.initialPost;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US';

  const [content, setContent] = useState('');
  const [ctaType, setCtaType] = useState<ChannelPostCTAType>('none');
  const [ctaPayloadJson, setCtaPayloadJson] = useState('');
  const [scheduledAt, setScheduledAt] = useState(buildDefaultSchedule());
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [deliverPersonally, setDeliverPersonally] = useState(false);
  const [images, setImages] = useState<ChannelPostMediaImage[]>([]);
  const [circles, setCircles] = useState<ChannelPostMediaCircle[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loadingInitialPost, setLoadingInitialPost] = useState(mode === 'edit');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerCircles, setPickerCircles] = useState<VideoCircle[]>([]);
  const [pickerSelectedIDs, setPickerSelectedIDs] = useState<number[]>([]);

  const awaitingNewCircleRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyPostState = useCallback((post: ChannelPost) => {
    setContent(post.content || '');
    setCtaType(post.ctaType || 'none');
    setCtaPayloadJson(post.ctaPayloadJson || '');
    const media = parsePostMedia(post.mediaJson || '');
    setImages(media.images || []);
    setCircles(media.circles || []);
  }, []);
  const ctaPlaceholder = useCallback((ctaType: ChannelPostCTAType) => {
    if (ctaType === 'book_service') {
      return t('portal.channelPostComposer.ctaPlaceholders.bookService');
    }
    if (ctaType === 'order_products') {
      return t('portal.channelPostComposer.ctaPlaceholders.orderProducts');
    }
    return '';
  }, [t]);

  useEffect(() => {
    let isActive = true;

    const loadChannel = async () => {
      if (!channelId) {
        if (isActive) {
          setIsPrivateChannel(false);
          setDeliverPersonally(false);
        }
        return;
      }

      try {
        const response = await channelService.getChannel(channelId);
        if (!isActive) return;
        const privateChannel = !response?.channel?.isPublic;
        setIsPrivateChannel(privateChannel);
        setDeliverPersonally(privateChannel);
      } catch (error) {
        console.error('[ChannelPostComposer] Failed to load channel details:', error);
        if (isActive) {
          setIsPrivateChannel(false);
          setDeliverPersonally(false);
        }
      }
    };

    void loadChannel();

    return () => {
      isActive = false;
    };
  }, [channelId]);

  useEffect(() => {
    if (mode !== 'edit') {
      setLoadingInitialPost(false);
      return;
    }
    if (!channelId) {
      Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.channelNotFound'));
      navigation.goBack();
      return;
    }

    let isActive = true;

    const loadPost = async () => {
      setLoadingInitialPost(true);
      try {
        if (initialPost) {
          if (!isActive) return;
          applyPostState(initialPost);
          return;
        }
        if (!postId) {
          Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.postEditNotFound'));
          navigation.goBack();
          return;
        }

        const response = await channelService.listPosts(channelId, { page: 1, limit: 100, includeDraft: true });
        if (!isActive) return;
        const found = (response.posts || []).find(item => item.ID === postId);
        if (!found) {
          Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.postNotFound'));
          navigation.goBack();
          return;
        }
        applyPostState(found);
      } catch (error: any) {
        Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.channelPostComposer.alerts.loadPostFailed'));
        navigation.goBack();
      } finally {
        if (isActive) {
          setLoadingInitialPost(false);
        }
      }
    };

    void loadPost();

    return () => {
      isActive = false;
    };
  }, [applyPostState, channelId, initialPost, mode, navigation, postId, t]);

  useFocusEffect(
    useCallback(() => {
      if (!awaitingNewCircleRef.current || !channelId) {
        return undefined;
      }

      awaitingNewCircleRef.current = false;
      let active = true;

      const attachLatestCircle = async () => {
        try {
          const response = await videoCirclesService.getMyVideoCircles(1, 20, {
            channelId,
            status: 'active',
          });
          if (!active) return;

          const latest = (response.circles || [])[0];
          if (!latest) {
            return;
          }

          const mapped = toCircleMedia(latest);
          setCircles(prev => {
            if (prev.some(item => item.id === mapped.id)) {
              return prev;
            }
            if (prev.length >= MAX_POST_CIRCLES) {
              return prev;
            }
            return [mapped, ...prev];
          });
        } catch {
          // no-op
        }
      };

      void attachLatestCircle();

      return () => {
        active = false;
      };
    }, [channelId])
  );

  const schedulePreview = useMemo(() => {
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
      return t('portal.channelPostComposer.alerts.invalidDate');
    }
    return date.toLocaleString(locale);
  }, [locale, scheduledAt, t]);

  const mediaJSON = useMemo(() => {
    const payload: ChannelPostMedia = {};
    if (images.length > 0) {
      payload.images = images;
    }
    if (circles.length > 0) {
      payload.circles = circles;
    }
    if (!payload.images && !payload.circles) {
      return '';
    }
    return JSON.stringify(payload);
  }, [images, circles]);

  const loadPickerCircles = useCallback(async () => {
    if (!channelId) return;
    setPickerLoading(true);
    try {
      const response = await videoCirclesService.getMyVideoCircles(1, 100, {
        channelId,
        status: 'active',
      });
      if (!mountedRef.current) return;
      setPickerCircles(response.circles || []);
    } catch {
      if (mountedRef.current) {
        setPickerCircles([]);
      }
    } finally {
      if (mountedRef.current) {
        setPickerLoading(false);
      }
    }
  }, [channelId]);

  const openCirclePicker = useCallback(() => {
    setPickerSelectedIDs(circles.map(item => item.id));
    setPickerVisible(true);
    void loadPickerCircles();
  }, [circles, loadPickerCircles]);

  const togglePickerCircle = useCallback((circleID: number) => {
    setPickerSelectedIDs(prev => {
      const exists = prev.includes(circleID);
      if (exists) {
        return prev.filter(item => item !== circleID);
      }
      if (prev.length >= MAX_POST_CIRCLES) {
        Alert.alert(t('portal.channelPostComposer.alerts.limitTitle'), t('portal.channelPostComposer.alerts.circlesLimit', { count: MAX_POST_CIRCLES }));
        return prev;
      }
      return [...prev, circleID];
    });
  }, [t]);

  const applyPickerSelection = useCallback(() => {
    const byID = new Map<number, ChannelPostMediaCircle>();
    circles.forEach(circle => byID.set(circle.id, circle));
    pickerCircles.forEach(circle => byID.set(circle.id, toCircleMedia(circle)));

    const next = pickerSelectedIDs
      .map(id => byID.get(id))
      .filter((item): item is ChannelPostMediaCircle => Boolean(item))
      .slice(0, MAX_POST_CIRCLES);
    setCircles(next);
    setPickerVisible(false);
  }, [circles, pickerCircles, pickerSelectedIDs]);

  const createCircleFromPicker = useCallback(() => {
    if (!channelId) {
      return;
    }
    setPickerVisible(false);
    awaitingNewCircleRef.current = true;
    navigation.navigate('VideoCirclesScreen', { openPublish: true, channelId });
  }, [channelId, navigation]);

  const pickAndUploadImages = useCallback(async () => {
    if (!channelId) {
      Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.channelNotFound'));
      return;
    }
    const remaining = MAX_POST_IMAGES - images.length;
    if (remaining <= 0) {
      Alert.alert(t('portal.channelPostComposer.alerts.limitTitle'), t('portal.channelPostComposer.alerts.imagesLimit', { count: MAX_POST_IMAGES }));
      return;
    }

    try {
      const picker = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: remaining,
        includeBase64: false,
        quality: 1,
      });
      if (picker.didCancel || !picker.assets || picker.assets.length === 0) {
        return;
      }

      setUploadingImages(true);
      const uploaded: ChannelPostMediaImage[] = [];
      for (const asset of picker.assets) {
        if (!asset?.uri) {
          continue;
        }
        const response = await channelService.uploadPostImage(channelId, {
          uri: asset.uri,
          name: asset.fileName || `post-media-${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        });
        uploaded.push({
          url: response.url,
          width: response.width,
          height: response.height,
          mimeType: normalizeImageMime(response.mimeType),
        });
      }
      if (uploaded.length > 0) {
        setImages(prev => [...prev, ...uploaded].slice(0, MAX_POST_IMAGES));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.channelPostComposer.alerts.uploadPhotoFailed'));
    } finally {
      setUploadingImages(false);
    }
  }, [channelId, images.length, t]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeCircle = useCallback((circleID: number) => {
    setCircles(prev => prev.filter(item => item.id !== circleID));
  }, []);

  const savePost = useCallback(async (action: PublishAction) => {
    const cleanContent = content.trim();
    const hasMedia = images.length > 0 || circles.length > 0;
    if (!cleanContent && !hasMedia) {
      Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.addContentOrMedia'));
      return;
    }
    if (!channelId) {
      Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.channelNotFound'));
      return;
    }

    let scheduleISO = '';
    if (mode === 'create' && action === 'schedule') {
      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) {
        Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.invalidScheduledDate'));
        return;
      }
      scheduleISO = date.toISOString();
    }

    const basePayload = {
      type: hasMedia ? ('media' as const) : ('text' as const),
      content: cleanContent,
      mediaJson: mediaJSON,
      ctaType,
      ctaPayloadJson: ctaType === 'none' ? '' : ctaPayloadJson.trim(),
      deliverPersonally: isPrivateChannel ? deliverPersonally : false,
    };

    setSubmitting(true);
    try {
      if (mode === 'edit') {
        if (!postId) {
          Alert.alert(t('common.error'), t('portal.channelPostComposer.alerts.postEditNotFound'));
          return;
        }
        await channelService.updatePost(channelId, postId, basePayload);
        Alert.alert(t('common.done'), t('portal.channelPostComposer.alerts.changesSaved'));
        navigation.goBack();
        return;
      }

      const post = await channelService.createPost(channelId, basePayload);

      if (action === 'publish') {
        await channelService.publishPost(channelId, post.ID);
      } else if (action === 'schedule') {
        await channelService.schedulePost(channelId, post.ID, { scheduledAt: scheduleISO });
      }

      const message =
        action === 'draft'
          ? t('portal.channelPostComposer.alerts.draftSaved')
          : action === 'publish'
            ? t('portal.channelPostComposer.alerts.postPublished')
            : t('portal.channelPostComposer.alerts.postScheduled');
      Alert.alert(t('common.done'), message);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.error || error?.message || t('portal.channelPostComposer.alerts.savePostFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [
    content,
    ctaPayloadJson,
    ctaType,
    channelId,
    circles.length,
    deliverPersonally,
    images.length,
    isPrivateChannel,
    mediaJSON,
    mode,
    navigation,
    postId,
    scheduledAt,
    t,
  ]);

  if (loadingInitialPost) {
    return (
      <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
        <SafeAreaView style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </SafeAreaView>
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
          <Text style={styles.headerTitle}>
            {mode === 'edit'
              ? t('portal.channelPostComposer.header.editTitle')
              : t('portal.channelPostComposer.header.createTitle')}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <KeyboardAwareContainer style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>{t('portal.channelPostComposer.form.postText')}</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder={t('portal.channelPostComposer.form.postTextPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={8}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.label}>
                {t('portal.channelPostComposer.form.photos', { current: images.length, max: MAX_POST_IMAGES })}
              </Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => void pickAndUploadImages()} disabled={uploadingImages}>
                {uploadingImages ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Plus size={16} color={colors.textPrimary} />}
                <Text style={styles.addBtnText}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
            {images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                {images.map((item, index) => (
                  <View key={`${item.url}-${index}`} style={styles.imageCard}>
                    <Image source={{ uri: item.url }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                      <Trash2 size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.hint}>{t('portal.channelPostComposer.form.photosHint', { count: MAX_POST_IMAGES })}</Text>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.label}>
                {t('portal.channelPostComposer.form.circles', { current: circles.length, max: MAX_POST_CIRCLES })}
              </Text>
              <TouchableOpacity style={styles.addBtn} onPress={openCirclePicker}>
                <Video size={16} color={colors.textPrimary} />
                <Text style={styles.addBtnText}>{t('portal.channelPostComposer.form.choose')}</Text>
              </TouchableOpacity>
            </View>
            {circles.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                {circles.map(item => (
                  <View key={item.id} style={styles.circleCard}>
                    {item.thumbnailUrl ? (
                      <Image source={{ uri: item.thumbnailUrl }} style={styles.circleThumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.circleFallback}>
                        <Video size={16} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.circleLabel} numberOfLines={1}>
                      {t('portal.channelPostComposer.sheet.circleLabel', { id: item.id })}
                    </Text>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeCircle(item.id)}>
                      <Trash2 size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.hint}>{t('portal.channelPostComposer.form.circlesHint', { count: MAX_POST_CIRCLES })}</Text>
            )}

            <Text style={styles.label}>{t('portal.channelPostComposer.form.cta')}</Text>
            <View style={styles.segmentedRow}>
              {CTA_TYPES.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.segmentedBtn, ctaType === option.value && styles.segmentedBtnActive]}
                  onPress={() => setCtaType(option.value)}
                >
                  <Text style={styles.segmentedBtnText}>{t(`portal.channelPostComposer.ctaTypes.${option}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {ctaType !== 'none' ? (
              <>
                <Text style={styles.label}>{t('portal.channelPostComposer.form.ctaPayload')}</Text>
                <TextInput
                  value={ctaPayloadJson}
                  onChangeText={setCtaPayloadJson}
                  placeholder={ctaPlaceholder(ctaType)}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={5}
                />
              </>
            ) : null}

            {isPrivateChannel ? (
              <View style={styles.toggleCard}>
                <View style={styles.toggleContent}>
                  <Text style={styles.toggleTitle}>{t('portal.channelPostComposer.form.deliverPersonallyTitle')}</Text>
                  <Text style={styles.toggleSubtitle}>{t('portal.channelPostComposer.form.deliverPersonallySubtitle')}</Text>
                </View>
                <Switch
                  value={deliverPersonally}
                  onValueChange={setDeliverPersonally}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.textPrimary}
                  ios_backgroundColor={colors.border}
                />
              </View>
            ) : null}

            {mode === 'create' ? (
              <>
                <Text style={styles.label}>{t('portal.channelPostComposer.form.scheduleLabel')}</Text>
                <View style={styles.presetsRow}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('plus1h'))}>
                    <Text style={styles.presetBtnText}>{t('portal.channelPostComposer.form.presets.plus1h')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('plus3h'))}>
                    <Text style={styles.presetBtnText}>{t('portal.channelPostComposer.form.presets.plus3h')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('tomorrow0900'))}>
                    <Text style={styles.presetBtnText}>{t('portal.channelPostComposer.form.presets.tomorrow0900')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('tomorrow1800'))}>
                    <Text style={styles.presetBtnText}>{t('portal.channelPostComposer.form.presets.tomorrow1800')}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={scheduledAt}
                  onChangeText={setScheduledAt}
                  placeholder="2026-02-11T18:30:00+03:00"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  autoCapitalize="none"
                />
                <View style={styles.schedulePreviewCard}>
                  <Text style={styles.schedulePreviewTitle}>{t('portal.channelPostComposer.form.schedulePreviewTitle')}</Text>
                  <Text style={styles.schedulePreviewValue}>{schedulePreview}</Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => void savePost('draft')} disabled={submitting}>
                    <Text style={styles.secondaryBtnText}>{t('portal.channelPostComposer.form.draftButton')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => void savePost('schedule')} disabled={submitting}>
                    <Text style={styles.secondaryBtnText}>{t('portal.channelPostComposer.form.scheduleButton')}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => void savePost('publish')} disabled={submitting}>
                  {submitting ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.primaryBtnText}>{t('portal.channelPostComposer.form.publishButton')}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => void savePost('draft')} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.primaryBtnText}>{t('portal.channelPostComposer.form.saveChangesButton')}</Text>}
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAwareContainer>
      </SafeAreaView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerVisible(false)} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('portal.channelPostComposer.sheet.title')}</Text>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setPickerVisible(false)}>
                <Text style={styles.sheetCloseBtnText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>

            {pickerLoading ? (
              <View style={styles.sheetLoader}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
                {pickerCircles.length > 0 ? (
                  pickerCircles.map(item => {
                    const selected = pickerSelectedIDs.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.sheetItem, selected && styles.sheetItemSelected]}
                        onPress={() => togglePickerCircle(item.id)}
                      >
                        {item.thumbnailUrl ? (
                          <Image source={{ uri: item.thumbnailUrl }} style={styles.sheetThumb} />
                        ) : (
                          <View style={styles.sheetThumbFallback}>
                            <Video size={15} color={colors.textSecondary} />
                          </View>
                        )}
                        <View style={styles.sheetItemMeta}>
                          <Text style={styles.sheetItemTitle}>{t('portal.channelPostComposer.sheet.circleLabel', { id: item.id })}</Text>
                          <Text style={styles.sheetItemSubtitle}>{new Date(item.createdAt).toLocaleString(locale)}</Text>
                        </View>
                        <View style={[styles.sheetCheck, selected && styles.sheetCheckActive]}>
                          {selected ? <Check size={14} color={colors.textPrimary} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.sheetEmpty}>{t('portal.channelPostComposer.sheet.empty')}</Text>
                )}
              </ScrollView>
            )}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.sheetActionBtn, styles.sheetSecondaryBtn]} onPress={createCircleFromPicker}>
                <Text style={styles.sheetSecondaryBtnText}>{t('portal.channelPostComposer.sheet.createCircle')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetActionBtn, styles.sheetPrimaryBtn]} onPress={applyPickerSelection}>
                <Text style={styles.sheetPrimaryBtnText}>{t('common.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      fontSize: 20,
      fontWeight: '800',
    },
    headerPlaceholder: {
      width: 36,
      height: 36,
    },
    form: {
      marginHorizontal: 16,
      gap: 10,
      paddingBottom: 28,
    },
    label: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 6,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    textArea: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    sectionHeader: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    addBtn: {
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    addBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    mediaRow: {
      gap: 10,
      paddingVertical: 2,
    },
    imageCard: {
      width: 118,
      height: 152,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    circleCard: {
      width: 116,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 8,
      gap: 6,
      position: 'relative',
    },
    circleThumb: {
      width: 58,
      height: 58,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    circleFallback: {
      width: 58,
      height: 58,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'center',
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleLabel: {
      color: colors.textPrimary,
      fontSize: 11,
      textAlign: 'center',
      paddingHorizontal: 6,
    },
    removeBtn: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    toggleCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    toggleContent: {
      flex: 1,
      gap: 4,
    },
    toggleTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    toggleSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    segmentedRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 2,
    },
    presetBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    presetBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    segmentedBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    segmentedBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    segmentedBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    schedulePreviewCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: -2,
    },
    schedulePreviewTitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 2,
    },
    schedulePreviewValue: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    actionsRow: {
      marginTop: 6,
      flexDirection: 'row',
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    secondaryBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    primaryBtn: {
      marginTop: 2,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    primaryBtnText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    sheetOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(3, 6, 15, 0.45)',
    },
    sheetCard: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
      backgroundColor: colors.background,
      maxHeight: '78%',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 20,
      gap: 12,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    sheetCloseBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    sheetCloseBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    sheetLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    sheetList: {
      maxHeight: 340,
    },
    sheetListContent: {
      gap: 8,
      paddingBottom: 4,
    },
    sheetItem: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 10,
    },
    sheetItemSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    sheetThumb: {
      width: 44,
      height: 44,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    sheetThumbFallback: {
      width: 44,
      height: 44,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    sheetItemMeta: {
      flex: 1,
      gap: 2,
    },
    sheetItemTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    sheetItemSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    sheetCheck: {
      width: 22,
      height: 22,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetCheckActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    sheetEmpty: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 16,
    },
    sheetActions: {
      flexDirection: 'row',
      gap: 10,
    },
    sheetActionBtn: {
      flex: 1,
      borderRadius: 11,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetSecondaryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sheetSecondaryBtnText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    sheetPrimaryBtn: {
      backgroundColor: colors.accent,
    },
    sheetPrimaryBtnText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
  });
