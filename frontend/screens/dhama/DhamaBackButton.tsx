import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { NavigationProp } from '@react-navigation/native';

import { RootStackParamList } from '../../types/navigation';
import { useSettings } from '../../context/SettingsContext';

type Props = {
  navigation: NavigationProp<RootStackParamList>;
};

export const DhamaBackButton: React.FC<Props> = ({ navigation }) => {
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
      style={[styles.button, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
      accessibilityRole="button"
      accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
      activeOpacity={0.85}
    >
      <ArrowLeft size={20} color={vTheme.colors.text} />
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
});
