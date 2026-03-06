import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Newspaper } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';

export const FeedQuickWidget: React.FC = () => {
  const navigation = useNavigation<any>();
  const { vTheme } = useSettings();
  const { i18n } = useTranslation();
  const copy = i18n.language?.startsWith('ru')
    ? { title: 'Лента', subtitle: 'Открыть' }
    : i18n.language?.startsWith('hi')
      ? { title: 'फ़ीड', subtitle: 'खोलें' }
      : { title: 'Feed', subtitle: 'Open' };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: vTheme.colors.surface }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ChannelsHub')}
    >
      <View style={[styles.iconWrap, { backgroundColor: '#0EA5A4' }]}>
        <Newspaper size={18} color="#fff" />
      </View>
      <Text style={[styles.title, { color: vTheme.colors.text }]}>{copy.title}</Text>
      <Text style={[styles.subtitle, { color: vTheme.colors.textSecondary }]}>{copy.subtitle}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    borderRadius: 18,
    padding: 8,
    justifyContent: 'space-between',
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
});
