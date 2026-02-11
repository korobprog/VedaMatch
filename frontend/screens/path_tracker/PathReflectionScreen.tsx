import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { pathTrackerService } from '../../services/pathTrackerService';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';

type Route = RouteProp<RootStackParamList, 'PathReflection'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const RESULT_OPTIONS = ['better', 'same', 'heavy'] as const;

export const PathReflectionScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);

  const [resultMood, setResultMood] = useState<(typeof RESULT_OPTIONS)[number]>('same');
  const [reflectionText, setReflectionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');

  const submit = async () => {
    try {
      setLoading(true);
      const data = await pathTrackerService.reflectStep({
        stepId: route.params.stepId,
        resultMood,
        reflectionText,
      });
      setReply(data.reply || '');
      setTimeout(() => {
        navigation.navigate('PathTrackerHome');
      }, 800);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('pathTracker.reflectError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pathTracker.reflectTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('pathTracker.reflectSubtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('pathTracker.reflectMood')}</Text>
        <View style={styles.row}>
          {RESULT_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.option, { borderColor: resultMood === item ? colors.accent : colors.border }]}
              onPress={() => setResultMood(item)}
            >
              <Text style={{ color: colors.textPrimary }}>{t(`pathTracker.reflectOptions.${item}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('pathTracker.reflectNote')}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
          value={reflectionText}
          onChangeText={setReflectionText}
          placeholder={t('pathTracker.reflectPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>

      {reply ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textPrimary }}>{reply}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={[styles.submit, { backgroundColor: colors.accent }]} onPress={submit} disabled={loading}>
        <Text style={styles.submitText}>{loading ? t('common.loading') : t('pathTracker.submitReflection')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  label: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 90, padding: 10, textAlignVertical: 'top' },
  submit: { borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  submitText: { color: '#fff', fontWeight: '700' },
});

