import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { proService, ProPlan, ProStatus } from '../../services/proService';
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
  const { user, login } = useUser();
  const [loading, setLoading] = useState(true);
  const [processingCode, setProcessingCode] = useState<string | null>(null);
  const [plans, setPlans] = useState<ProPlan[]>([]);
  const [status, setStatus] = useState<ProStatus | null>(null);

  const roleFree = useMemo(() => isRoleFree(user?.role), [user?.role]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planList, statusData] = await Promise.all([
        proService.getPlans(),
        proService.getStatus(),
      ]);
      setPlans(planList);
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

  const applyUserEntitlement = useCallback(async (nextStatus?: ProStatus | null) => {
    if (!user || !nextStatus) return;
    const nextUser = {
      ...user,
      godModeEnabled: !!nextStatus.isProEffective,
    };
    await login(nextUser);
  }, [login, user]);

  const handlePurchase = useCallback((plan: ProPlan) => {
    if (processingCode) return;
    Alert.alert(
      'PRO purchase',
      `Buy ${plan.title} for ${plan.priceLkm} LKM?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            try {
              setProcessingCode(plan.code);
              const result = await proService.purchase(plan.code);
              setStatus(result.status);
              await applyUserEntitlement(result.status);
              Alert.alert('Done', 'PRO activated');
            } catch (error: any) {
              const code = String(error?.code || '');
              if (code === 'INSUFFICIENT_LKM') {
                Alert.alert('Not enough LKM', 'Top up your LKM balance and try the purchase again.');
              } else if (code === 'PRO_ALREADY_FREE_BY_ROLE') {
                Alert.alert('PRO is already active', 'PRO is enabled for your role for free.');
              } else {
                Alert.alert('Error', error?.message || 'Failed to complete the purchase');
              }
            } finally {
              setProcessingCode(null);
              await load();
            }
          },
        },
      ],
    );
  }, [applyUserEntitlement, load, processingCode]);

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
        <Text style={styles.title}>Manage PRO</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>PRO status</Text>
          <Text style={styles.statusValue}>{status?.isProEffective ? 'Active' : 'Inactive'}</Text>
          {roleFree ? (
            <Text style={styles.statusHint}>Access is enabled by role (free)</Text>
          ) : status?.currentSubscription?.endsAt ? (
            <Text style={styles.statusHint}>Active until {formatDate(status.currentSubscription.endsAt)}</Text>
          ) : (
            <Text style={styles.statusHint}>Unlock all organizations and filters</Text>
          )}
        </View>

        {roleFree ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Purchase is not required for your role.</Text>
          </View>
        ) : (
          plans.map(plan => {
            const busy = processingCode === plan.code;
            return (
              <View key={plan.code} style={[styles.planCard, plan.isPopular ? styles.planCardPopular : null]}>
                <View style={styles.planTop}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  {!!plan.badge && <Text style={styles.badge}>{plan.badge}</Text>}
                </View>
                <Text style={styles.planPrice}>{plan.priceLkm} LKM</Text>
                <Text style={styles.planMeta}>{plan.days} days</Text>
                <TouchableOpacity
                  style={[styles.buyBtn, busy ? styles.buyBtnDisabled : null]}
                  disabled={busy}
                  onPress={() => handlePurchase(plan)}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <Text style={styles.buyText}>Buy</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
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
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3d2ad',
    padding: 16,
    gap: 8,
  },
  planCardPopular: {
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  planPrice: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f97316',
  },
  planMeta: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  buyBtn: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buyBtnDisabled: {
    opacity: 0.7,
  },
  buyText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ProPlansScreen;
