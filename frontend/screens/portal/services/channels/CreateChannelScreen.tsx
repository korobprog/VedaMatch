import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';

export default function CreateChannelScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Ошибка', 'Введите название канала');
      return;
    }

    setSaving(true);
    try {
      const channel = await channelService.createChannel({
        title: cleanTitle,
        description: description.trim(),
        isPublic,
      });

      Alert.alert('Готово', 'Канал создан');
      navigation.replace('ChannelDetails', { channelId: channel.ID });
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось создать канал');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новый канал</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Название</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Например: Ягьи и мантры"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            maxLength={200}
          />

          <Text style={styles.label}>Описание</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="О чем этот канал"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={5}
          />

          <View style={styles.visibilityRow}>
            <View>
              <Text style={styles.visibilityTitle}>Публичный канал</Text>
              <Text style={styles.visibilitySub}>Доступен всем пользователям</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: colors.border, true: colors.accentSoft }}
              thumbColor={isPublic ? colors.accent : colors.surfaceElevated}
            />
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.createButtonText}>Создать канал</Text>
            )}
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
      marginTop: 8,
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
      fontSize: 15,
    },
    textArea: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    visibilityRow: {
      marginTop: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    visibilityTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    visibilitySub: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    createButton: {
      marginTop: 10,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    createButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
  });
