import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTenants } from '../services/database';
import { getAllTenantBalances, formatCurrency } from '../services/calculationService';
import type { TenantBalance } from '../services/calculationService';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const [balances, setBalances] = useState<TenantBalance[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    try {
      const tenants = getAllTenants();
      const balancesData = getAllTenantBalances(tenants);
      setBalances(balancesData);
    } catch (error) {
      console.error('Error loading tenants:', error);
      Alert.alert('Fehler', 'Mieter konnten nicht geladen werden.');
    }
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const renderTenantCard = ({ item }: { item: TenantBalance }) => {
    const saldoColor = item.saldo > 0 ? '#EF4444' : item.saldo < 0 ? '#10B981' : '#6B7280';
    const saldoText = item.saldo > 0 ? 'Rückstand' : item.saldo < 0 ? 'Guthaben' : 'Ausgeglichen';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('TenantDetail', { tenantId: item.tenant.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.tenantName}>{item.tenant.name}</Text>
          <View style={[styles.badge, { backgroundColor: saldoColor + '20' }]}>
            <Text style={[styles.badgeText, { color: saldoColor }]}>{saldoText}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Monatliche Rate:</Text>
            <Text style={styles.value}>{formatCurrency(item.monatlicheRate)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Soll (gesamt):</Text>
            <Text style={styles.value}>{formatCurrency(item.soll)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Ist (bezahlt):</Text>
            <Text style={styles.value}>{formatCurrency(item.ist)}</Text>
          </View>

          <View style={[styles.infoRow, styles.saldoRow]}>
            <Text style={styles.labelBold}>Saldo:</Text>
            <Text style={[styles.valueBold, { color: saldoColor }]}>
              {formatCurrency(Math.abs(item.saldo))}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mieteinnahmen</Text>
        <Text style={styles.subtitle}>{balances.length} Mieter</Text>
      </View>

      <FlatList
        data={balances}
        renderItem={renderTenantCard}
        keyExtractor={(item) => item.tenant.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Keine Mieter vorhanden</Text>
            <Text style={styles.emptySubtext}>
              Füge deinen ersten Mieter hinzu
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTenant')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#DBEAFE',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tenantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saldoRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  labelBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  valueBold: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
