import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ServiceHint } from '../../types/portalBlueprint';

interface RoleInfoModalProps {
  visible: boolean;
  title: string;
  servicesHint: ServiceHint[] | string[];
  onClose: () => void;
  onEditRole?: () => void;
}

export const RoleInfoModal: React.FC<RoleInfoModalProps> = ({
  visible,
  title,
  servicesHint,
  onClose,
  onEditRole
}) => {
  const { t } = useTranslation();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t(`portal.roles.${title.toLowerCase()}`, title)}</Text>
          <Text style={styles.subtitle}>{t('portal.priority_services_hint', 'Этим сервисам вы получите приоритет в портале:')}</Text>
          {servicesHint.map((hint, index) => {
            const labelKey = typeof hint === 'string' ? hint : hint.title;
            const filters = typeof hint === 'string' ? [] : hint.filters || [];

            // Try to translate the service title if possible
            const label = t(`services.titles.${labelKey.toLowerCase()}`, labelKey);

            return (
              <View key={`${label}-${index}`} style={styles.itemRow}>
                <Text style={styles.itemText}>• {label}</Text>
                {filters.length > 0 && (
                  <Text style={styles.filterText}>
                    {filters.map(f => t(`portal.filters.${f}`, f)).join(', ')}
                  </Text>
                )}
              </View>
            );
          })}

          <View style={styles.footer}>
            {onEditRole && (
              <Pressable onPress={onEditRole} style={styles.editButton}>
                <Text style={styles.editButtonText}>{t('portal.change_role', 'Изменить роль')}</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>{t('common.got_it', 'Понятно')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(248,250,252,0.8)',
    marginBottom: 12,
  },
  itemRow: {
    marginBottom: 9,
    backgroundColor: 'rgba(15,23,42,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 9,
  },
  itemText: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  filterText: {
    fontSize: 12,
    color: 'rgba(248,250,252,0.72)',
    marginTop: 3,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editButtonText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 14,
  },
});
