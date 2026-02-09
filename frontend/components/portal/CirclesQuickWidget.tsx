import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera, Film } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import { useSettings } from '../../context/SettingsContext';

export const CirclesQuickWidget: React.FC = () => {
  const navigation = useNavigation<any>();
  const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
  const isPhotoBg = portalBackgroundType === 'image';

  const primaryTextStyle = { color: isPhotoBg ? '#ffffff' : vTheme.colors.text };
  const secondaryTextStyle = { color: isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.container,
        {
          backgroundColor: isPhotoBg
            ? 'transparent'
            : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'),
          borderColor: isPhotoBg
            ? 'rgba(255,255,255,0.3)'
            : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'),
        },
      ]}
      onPress={() => navigation.navigate('VideoCirclesScreen')}
      onLongPress={() => navigation.navigate('VideoCirclesScreen', { openPublish: true })}
    >
      {(isPhotoBg || isDarkMode) && (
        <BlurView
          style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          blurType={isDarkMode ? "dark" : "light"}
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
        />
      )}

      <View style={[styles.iconWrap, { backgroundColor: '#EA580C' }]}>
        <Film size={18} color="#ffffff" />
      </View>

      <View style={styles.titleContainer}>
        <Text style={[styles.title, primaryTextStyle]}>Кружки</Text>
      </View>

      <View style={styles.footer}>
        <Camera size={11} color={isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary} />
        <Text style={[styles.footerText, secondaryTextStyle]} numberOfLines={1}>
          Запись
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'space-between',
    margin: 4,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerText: {
    fontSize: 8,
    fontWeight: '500',
    flex: 1,
  },
});

