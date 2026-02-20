import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

interface OpenRoomJoinModalProps {
  visible: boolean;
  roomName?: string;
  joinAsListener: boolean;
  onChangeJoinAsListener: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  isPhotoBg: boolean;
  colors: {
    surfaceElevated: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
  t: (key: string) => string;
}

export const OpenRoomJoinModal: React.FC<OpenRoomJoinModalProps> = ({
  visible,
  roomName,
  joinAsListener,
  onChangeJoinAsListener,
  onCancel,
  onConfirm,
  loading,
  isPhotoBg,
  colors,
  t,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.preJoinOverlay}>
        <View
          style={[
            styles.preJoinCard,
            {
              backgroundColor: isPhotoBg ? 'rgba(17,24,39,0.95)' : colors.surfaceElevated,
              borderColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : colors.border,
            },
          ]}
        >
          <Text style={[styles.preJoinTitle, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>
            {roomName || t('chat.joinRoom')}
          </Text>
          <Text style={[styles.preJoinDesc, { color: isPhotoBg ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
            {t('chat.joinAsListenerDesc') || 'Слушатель: аудио/видео отключены, чат доступен.'}
          </Text>
          <View style={styles.listenerRow}>
            <Text style={[styles.listenerLabel, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>
              {t('chat.joinAsListener')}
            </Text>
            <Switch
              testID="open-room-listener-switch"
              value={joinAsListener}
              onValueChange={onChangeJoinAsListener}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>

          <View style={styles.preJoinActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.preJoinButton, styles.preJoinCancel, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.25)' : colors.border }]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={[styles.preJoinButtonText, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.preJoinButton, { backgroundColor: colors.accent }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.preJoinButtonText, { color: '#fff' }]}>{t('chat.joinRoom') || 'Войти'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  preJoinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  preJoinCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  preJoinTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  preJoinDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  listenerRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listenerLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  preJoinActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  preJoinButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preJoinCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  preJoinButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
