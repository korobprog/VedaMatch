import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { NavigationProp } from '@react-navigation/native';

import { RootStackParamList } from '../../types/navigation';
import { useSettings } from '../../context/SettingsContext';

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  variant?: 'default' | 'hero';
};

export const DhamaBackButton: React.FC<Props> = ({ navigation, variant = 'default' }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Portal');
  };

  return (
    <TouchableOpacity
      onPress={handleBack}
      style={[
        styles.button,
        variant === 'default' ? styles.defaultButton : null,
        variant === 'hero' ? styles.heroButton : null,
        variant === 'hero'
          ? styles.heroButtonSurface
          : {
            backgroundColor: vTheme.colors.surfaceElevated,
            borderColor: vTheme.colors.divider,
          },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
      activeOpacity={0.85}
    >
      <ArrowLeft size={variant === 'hero' ? 18 : 18} color={variant === 'hero' ? '#FFF8EA' : vTheme.colors.text} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
  },
  heroButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroButtonSurface: {
    backgroundColor: 'rgba(255, 248, 234, 0.12)',
    borderColor: 'rgba(255, 244, 228, 0.24)',
  },
});
