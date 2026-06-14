import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTenants, getAllPayments } from '../services/database';
import { getAllTenantBalances, formatCurrency } from '../services/calculationService';
import { calculateGlobalQuarterlyReport } from '../utils/rentCalculations';
import { generateGlobalQuarterlyPDF } from '../services/globalReportPdfService';
import type { TenantBalance } from '../services/calculationService';
import type { Payment } from '../models';

interface DashboardScreenProps {
  navigation: any;
}

interface TenantSection {
  title: string;
  data: TenantBalance[];
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const [sections, setSections] = useState<TenantSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(1);

  const loadData = useCallback(() => {
    try {
      const tenants = getAllTenants();
      const balancesData = getAllTenantBalances(tenants);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Separate active and former tenants
      const active: TenantBalance[] = [];
      const former: TenantBalance[] = [];

      balancesData.forEach(balance => {
        if (!balance.tenant.termination_date) {
          // No termination date = active
          active.push(balance);
        } else {
          const terminationDate = new Date(balance.tenant.termination_date);
          terminationDate.setHours(0, 0, 0, 0);

          if (terminationDate >= today) {
            // Termination date is today or future = active
            active.push(balance);
          } else {
            // Termination date is in the past = former
            former.push(balance);
          }
        }
      });

      const newSections: TenantSection[] = [];

      if (active.length > 0) {
        newSections.push({ title: 'Aktive Mieter', data: active });
      }

      if (former.length > 0) {
        newSections.push({ title: 'Ehemalige Mieter', data: former });
      }

      setSections(newSections);
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

  const handleGenerateGlobalReport = async () => {
    try {
      const tenants = getAllTenants();
      const allPayments = getAllPayments();

      if (tenants.length === 0) {
        Alert.alert('No Tenants', 'Please add tenants first before generating a report.');
        return;
      }

      const report = calculateGlobalQuarterlyReport(
        tenants,
        allPayments,
        selectedYear,
        selectedQuarter
      );

      if (report.tenants.length === 0) {
        Alert.alert(
          'No Activity',
          'No tenants were active during the selected quarter.'
        );
        return;
      }

      setModalVisible(false);
      await generateGlobalQuarterlyPDF(report);
    } catch (error) {
      console.error('Error generating global report:', error);
      Alert.alert('Error', 'Failed to generate the global report.');
    }
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

  // Generate year options (last 5 years and next 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  // Calculate total tenants
  const totalTenants = sections.reduce((sum, section) => sum + section.data.length, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Mieteinnahmen</Text>
            <Text style={styles.subtitle}>{totalTenants} Mieter</Text>
          </View>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.reportButtonText}>📊 Bericht</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderTenantCard}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
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

      {/* Global Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Global Quarterly Report</Text>

            <Text style={styles.inputLabel}>Lease Year</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionScrollView}
            >
              {yearOptions.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.optionButton,
                    selectedYear === year && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      selectedYear === year && styles.optionButtonTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Quarter</Text>
            <View style={styles.quarterContainer}>
              {[1, 2, 3, 4].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.quarterButton,
                    selectedQuarter === q && styles.quarterButtonSelected,
                  ]}
                  onPress={() => setSelectedQuarter(q)}
                >
                  <Text
                    style={[
                      styles.quarterButtonText,
                      selectedQuarter === q && styles.quarterButtonTextSelected,
                    ]}
                  >
                    Q{q}
                  </Text>
                  <Text
                    style={[
                      styles.quarterButtonSubtext,
                      selectedQuarter === q && styles.quarterButtonTextSelected,
                    ]}
                  >
                    {q === 1 ? 'Dec-Feb' : q === 2 ? 'Mar-May' : q === 3 ? 'Jun-Aug' : 'Sep-Nov'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.generateButton]}
                onPress={handleGenerateGlobalReport}
              >
                <Text style={styles.generateButtonText}>Generate PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  sectionHeader: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  optionScrollView: {
    flexGrow: 0,
    marginBottom: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  optionButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  quarterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quarterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  quarterButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  quarterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  quarterButtonSubtext: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  quarterButtonTextSelected: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#2563EB',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
