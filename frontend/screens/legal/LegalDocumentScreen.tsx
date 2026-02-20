import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../components/chat/ChatConstants';
import { useSettings } from '../../context/SettingsContext';
import {
  DEFAULT_LEGAL_RUNTIME_CONFIG,
  getLocalLegalDocument,
  type LegalRuntimeConfig,
} from '../../content/legalDocuments';
import {
  getLegalDocumentUrl,
  normalizeLanguageCode,
} from '../../config/legal.config';
import { legalConfigService } from '../../services/legalConfigService';
import type { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LegalDocument'>;

const languageLabel = (language: 'en' | 'ru' | 'hi'): string => {
  if (language === 'ru') return 'Русский';
  if (language === 'hi') return 'हिंदी';
  return 'English';
};

export const LegalDocumentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useSettings();
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  const [runtimeConfig, setRuntimeConfig] = useState<LegalRuntimeConfig>(DEFAULT_LEGAL_RUNTIME_CONFIG);

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      const config = await legalConfigService.getPublicConfig();
      if (mounted) {
        setRuntimeConfig(config);
      }
    };
    void loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const language = normalizeLanguageCode(route.params?.language || i18n.language);
  const docType = route.params.type;
  const document = useMemo(
    () => getLocalLegalDocument(docType, language, runtimeConfig),
    [docType, language, runtimeConfig],
  );

  const openWebVersion = async () => {
    const url = getLegalDocumentUrl(docType, language);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('common.error'), t('common.tryAgain') || 'Try again');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.warn('[LegalDocument] Failed to open web version:', error);
      Alert.alert(t('common.error'), t('common.tryAgain') || 'Try again');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>← {t('common.back') || 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: theme.text }]}>{document.title}</Text>
          <Text style={[styles.meta, { color: theme.subText }]}>
            {document.updatedAt} · {languageLabel(language)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {document.sections.map((section) => (
          <View key={section.title} style={[styles.section, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <Text key={`${section.title}-${paragraphIndex}`} style={[styles.paragraph, { color: theme.subText }]}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <TouchableOpacity
          onPress={() => { void openWebVersion(); }}
          style={[styles.webButton, { borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
        >
          <Text style={[styles.webButtonText, { color: theme.text }]}>
            {t('common.open') || 'Open'} web version
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTextWrap: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  meta: {
    fontSize: 13,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
  },
  webButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  webButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LegalDocumentScreen;
