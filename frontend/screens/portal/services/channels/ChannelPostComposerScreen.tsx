import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { ChannelPostCTAType } from '../../../../types/channel';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';

type RouteParams = {
  ChannelPostComposer: {
    channelId: number;
  };
};

type PublishAction = 'draft' | 'publish' | 'schedule';

const CTA_TYPES: { value: ChannelPostCTAType; label: string }[] = [
  { value: 'none', label: 'Без CTA' },
  { value: 'order_products', label: 'Заказ товаров' },
  { value: 'book_service', label: 'Запись на услугу' },
];

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

const ctaPlaceholder = (ctaType: ChannelPostCTAType) => {
  if (ctaType === 'book_service') {
    return '{"serviceId": 123}';
  }
  if (ctaType === 'order_products') {
    return '{"shopId": 10, "items": [{"productId": 1, "quantity": 1}], "buyerNote": "Имена для ягьи"}';
  }
  return '';
};

export default function ChannelPostComposerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ChannelPostComposer'>>();
  const channelId = route.params?.channelId;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [content, setContent] = useState('');
  const [ctaType, setCtaType] = useState<ChannelPostCTAType>('none');
  const [ctaPayloadJson, setCtaPayloadJson] = useState('');
  const [scheduledAt, setScheduledAt] = useState(buildDefaultSchedule());
  const [submitting, setSubmitting] = useState(false);

  const schedulePreview = useMemo(() => {
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
      return 'Некорректная дата';
    }
    return date.toLocaleString('ru-RU');
  }, [scheduledAt]);

  const createPost = async (action: PublishAction) => {
    const cleanContent = content.trim();
    if (!cleanContent) {
      Alert.alert('Ошибка', 'Введите текст поста');
      return;
    }
    if (!channelId) {
      Alert.alert('Ошибка', 'Канал не найден');
      return;
    }

    let scheduleISO = '';
    if (action === 'schedule') {
      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) {
        Alert.alert('Ошибка', 'Некорректная дата отложенной публикации');
        return;
      }
      scheduleISO = date.toISOString();
    }

    setSubmitting(true);
    try {
      const post = await channelService.createPost(channelId, {
        type: 'text',
        content: cleanContent,
        ctaType,
        ctaPayloadJson: ctaType === 'none' ? '' : ctaPayloadJson.trim(),
      });

      if (action === 'publish') {
        await channelService.publishPost(channelId, post.ID);
      }

      if (action === 'schedule') {
        await channelService.schedulePost(channelId, post.ID, {
          scheduledAt: scheduleISO,
        });
      }

      const message =
        action === 'draft'
          ? 'Черновик сохранен'
          : action === 'publish'
            ? 'Пост опубликован'
            : 'Пост поставлен в отложку';

      Alert.alert('Готово', message);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || error?.message || 'Не удалось создать пост');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новый пост</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Текст поста</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Введите текст публикации..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={8}
          />

          <Text style={styles.label}>CTA</Text>
          <View style={styles.segmentedRow}>
            {CTA_TYPES.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.segmentedBtn, ctaType === option.value && styles.segmentedBtnActive]}
                onPress={() => setCtaType(option.value)}
              >
                <Text style={styles.segmentedBtnText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {ctaType !== 'none' ? (
            <>
              <Text style={styles.label}>CTA payload (JSON)</Text>
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

          <Text style={styles.label}>Отложка (ISO дата/время)</Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('plus1h'))}>
              <Text style={styles.presetBtnText}>+1 час</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('plus3h'))}>
              <Text style={styles.presetBtnText}>+3 часа</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('tomorrow0900'))}>
              <Text style={styles.presetBtnText}>Завтра 09:00</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setScheduledAt(buildPresetDate('tomorrow1800'))}>
              <Text style={styles.presetBtnText}>Завтра 18:00</Text>
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
            <Text style={styles.schedulePreviewTitle}>Публикация по времени:</Text>
            <Text style={styles.schedulePreviewValue}>{schedulePreview}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => createPost('draft')} disabled={submitting}>
              <Text style={styles.secondaryBtnText}>Черновик</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => createPost('schedule')} disabled={submitting}>
              <Text style={styles.secondaryBtnText}>Отложить</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => createPost('publish')} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.primaryBtnText}>Опубликовать</Text>}
          </TouchableOpacity>
        </View>
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
  });
