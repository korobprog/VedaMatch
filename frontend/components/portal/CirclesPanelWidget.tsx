import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Film, ChevronLeft, ChevronRight, Camera } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import { useSettings } from '../../context/SettingsContext';
import { VideoCircle, videoCirclesService } from '../../services/videoCirclesService';

export const CirclesPanelWidget: React.FC = () => {
  const navigation = useNavigation<any>();
  const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
  const [circles, setCircles] = useState<VideoCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'friends'>('all');
  const isPhotoBg = portalBackgroundType === 'image';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await videoCirclesService.getVideoCircles({
          status: 'active',
          limit: 8,
          scope: filter
        });
        if (mounted) {
          setCircles(response.circles || []);
        }
      } catch (error) {
        if (mounted) setCircles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [filter]);

  const toggleFilter = () => {
    setFilter(prev => prev === 'all' ? 'friends' : 'all');
  };

  const primaryTextStyle = { color: isPhotoBg ? '#ffffff' : vTheme.colors.text };
  const secondaryTextStyle = { color: isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary };

  return (
    <View
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
    >
      {(isPhotoBg || isDarkMode) && (
        <BlurView
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          blurType={isDarkMode ? "dark" : "light"}
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
        />
      )}

      {/* Header matches CalendarWidget layout */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleFilter} style={styles.navButton}>
          <ChevronLeft size={16} color={isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.titleText, primaryTextStyle]}>
          {filter === 'all' ? 'Кружки: Лента' : 'Кружки: Друзья'}
        </Text>
        <TouchableOpacity onPress={toggleFilter} style={styles.navButton}>
          <ChevronRight size={16} color={isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.circlesGrid}>
        {/* Create button slot */}
        <TouchableOpacity
          style={styles.circleSlot}
          onPress={() => navigation.navigate('VideoCirclesScreen', { openPublish: true })}
        >
          <View style={[styles.createIcon, {
            backgroundColor: '#EA580C20',
            borderColor: isPhotoBg ? 'rgba(255,255,255,0.4)' : '#EA580C40'
          }]}>
            <Camera size={18} color={isPhotoBg ? '#ffffff' : '#EA580C'} />
          </View>
          <Text style={[styles.slotLabel, secondaryTextStyle]}>Снять</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={vTheme.colors.primary} />
          </View>
        ) : circles.length > 0 ? (
          circles.slice(0, 5).map((circle) => (
            <TouchableOpacity
              key={circle.id}
              style={styles.circleSlot}
              onPress={() => navigation.navigate('VideoCirclesScreen', { initialCircleId: circle.id })}
            >
              <View style={[styles.avatarContainer, {
                borderColor: circle.premiumBoostActive ? '#FFD700' : (isPhotoBg ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)')
              }]}>
                {circle.thumbnailUrl ? (
                  <Image source={{ uri: circle.thumbnailUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.placeholderAvatar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Film size={14} color={isPhotoBg ? '#ffffff' : '#EA580C'} />
                  </View>
                )}
              </View>
              <Text style={[styles.slotLabel, secondaryTextStyle]} numberOfLines={1}>
                {circle.matha || 'Кружок'}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, secondaryTextStyle]}>Нет кружков</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 168,
    height: 168,
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    margin: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 4,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  circlesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  circleSlot: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 10,
  },
  createIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    padding: 1.5,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotLabel: {
    fontSize: 8,
    marginTop: 3,
    fontWeight: '500',
  },
  loaderContainer: {
    width: '66%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    width: '66%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 9,
    fontStyle: 'italic',
  }
});

