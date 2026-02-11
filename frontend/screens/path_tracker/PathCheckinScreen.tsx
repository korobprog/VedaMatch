import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { pathTrackerService } from '../../services/pathTrackerService';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MOOD_OPTIONS = ['calm', 'anxious', 'tired', 'inspired', 'heavy'] as const;
const ENERGY_OPTIONS = ['low', 'medium', 'high'] as const;
const DURATION_OPTIONS: Array<3 | 5 | 10> = [3, 5, 10];

export const PathCheckinScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);

  const [moodCode, setMoodCode] = useState<(typeof MOOD_OPTIONS)[number]>('calm');
  const [energyCode, setEnergyCode] = useState<(typeof ENERGY_OPTIONS)[number]>('medium');
  const [availableMinutes, setAvailableMinutes] = useState<3 | 5 | 10>(5);
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await pathTrackerService.saveCheckin({
        moodCode,
        energyCode,
        availableMinutes,
        freeText,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const step = await pathTrackerService.generateStep();
      navigation.replace('PathStep', { stepId: step.stepId, step });
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('pathTracker.checkinError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pathTracker.checkinTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('pathTracker.checkinSubtitle')}</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('pathTracker.mood')}</Text>
        <View style={styles.row}>
          {MOOD_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.option, { borderColor: moodCode === item ? colors.accent : colors.border }]}
              onPress={() => setMoodCode(item)}
            >
              <Text style={{ color: colors.textPrimary }}>{t(`pathTracker.moodOptions.${item}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('pathTracker.energy')}</Text>
        <View style={styles.row}>
          {ENERGY_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.option, { borderColor: energyCode === item ? colors.accent : colors.border }]}
              onPress={() => setEnergyCode(item)}
            >
              <Text style={{ color: colors.textPrimary }}>{t(`pathTracker.energyOptions.${item}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('pathTracker.time')}</Text>
        <View style={styles.row}>
          {DURATION_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.option, { borderColor: availableMinutes === item ? colors.accent : colors.border }]}
              onPress={() => setAvailableMinutes(item)}
            >
              <Text style={{ color: colors.textPrimary }}>{item} {t('common.min')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('pathTracker.noteOptional')}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
          value={freeText}
          onChangeText={setFreeText}
          placeholder={t('pathTracker.notePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>

      <TouchableOpacity style={[styles.submit, { backgroundColor: colors.accent }]} onPress={submit} disabled={loading}>
        <Text style={styles.submitText}>{loading ? t('common.loading') : t('pathTracker.submitCheckin')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  label: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 80, padding: 10, textAlignVertical: 'top' },
  submit: { borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

