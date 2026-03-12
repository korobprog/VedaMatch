import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { proService, ProStatus } from '../../services/proService';
import { useUser } from '../../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ProPlans'>;

const isRoleFree = (role?: string): boolean => {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'superadmin';
};

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const ProPlansScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProStatus | null>(null);

  const roleFree = useMemo(() => isRoleFree(user?.role), [user?.role]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusData = await proService.getStatus();
      setStatus(statusData);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load PRO data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PRO status</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>PRO status</Text>
          <Text style={styles.statusValue}>{status?.isProEffective ? 'Active' : 'Inactive'}</Text>
          {roleFree ? (
            <Text style={styles.statusHint}>Access is enabled by role (free)</Text>
          ) : status?.currentSubscription?.endsAt ? (
            <Text style={styles.statusHint}>Active until {formatDate(status.currentSubscription.endsAt)}</Text>
          ) : (
            <Text style={styles.statusHint}>No active PRO access on this account</Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Status is synced automatically for your account.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f4',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7cdd9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  backText: {
    fontSize: 22,
    color: '#111827',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 44,
    gap: 12,
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3d2ad',
    padding: 16,
    gap: 6,
  },
  statusTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 28,
    color: '#111827',
    fontWeight: '900',
  },
  statusHint: {
    fontSize: 14,
    color: '#4b5563',
  },
  infoCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    padding: 14,
  },
  infoText: {
    color: '#7c2d12',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProPlansScreen;
