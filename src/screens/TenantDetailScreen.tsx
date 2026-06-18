import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { tenantAPI, paymentAPI } from '../services/api';
import { getTenantBalance, formatCurrency, formatNumber, formatDate } from '../services/calculationService';
import { generateTenantPDF } from '../services/pdfService';
import { calculateFiscalYearData } from '../utils/rentCalculations';
import type { Tenant, Payment, PaymentInput } from '../models';
import type { FiscalYearData } from '../utils/rentCalculations';

interface TenantDetailScreenProps {
  route: any;
  navigation: any;
}

/**
 * Format role name for display
 */
const formatRole = (role?: string): string => {
  if (!role) return 'Unknown';
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Admin';
    case 'rent_collector':
      return 'Rent Collector';
    case 'spectator':
      return 'Spectator';
    default:
      return 'Unknown';
  }
};

/**
 * Get badge color for role
 */
const getRoleBadgeColor = (role?: string): string => {
  if (!role) return '#9CA3AF';
  switch (role.toLowerCase()) {
    case 'admin':
      return '#EF4444'; // Red
    case 'rent_collector':
      return '#2563EB'; // Blue
    case 'spectator':
      return '#6B7280'; // Gray
    default:
      return '#9CA3AF';
  }
};

export default function TenantDetailScreen({ route, navigation }: TenantDetailScreenProps) {
  const { tenantId } = route.params;
  const { canAddPayments, canEditTenants, canDeleteTenants } = useAuth();
  const insets = useSafeAreaInsets();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [fiscalYearsData, setFiscalYearsData] = useState<FiscalYearData[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [terminationModalVisible, setTerminationModalVisible] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0], // Today's date
  });
  const [terminationDate, setTerminationDate] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [isRenamingTenant, setIsRenamingTenant] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tenantData, paymentsData] = await Promise.all([
        tenantAPI.getTenant(String(tenantId)),
        paymentAPI.listPayments(String(tenantId))
      ]);

      if (!tenantData) {
        Alert.alert('Error', 'Tenant not found');
        navigation.goBack();
        return;
      }

      setTenant(tenantData);
      setPayments(paymentsData);
      const balanceData = getTenantBalance(tenantData, paymentsData);
      setBalance(balanceData);
      const fiscalData = calculateFiscalYearData(tenantData, paymentsData);
      setFiscalYearsData(fiscalData);
    } catch (error) {
      console.error('Error loading tenant details:', error);
      Alert.alert('Error', 'Failed to load tenant details. Please check your internet connection.');
    }
  }, [tenantId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPayment = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      const paymentInput: PaymentInput = {
        tenant_id: String(tenantId),
        payment_date: newPayment.payment_date,
        amount: parseFloat(newPayment.amount),
      };

      await paymentAPI.createPayment(paymentInput);
      setModalVisible(false);
      setNewPayment({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
      });
      await loadData();
      Alert.alert('Success', 'Payment was recorded.');
    } catch (error) {
      console.error('Error adding payment:', error);
      Alert.alert('Error', 'Failed to record payment.');
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    Alert.alert(
      'Delete Payment',
      'Do you really want to delete this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentAPI.deletePayment(paymentId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete payment.');
            }
          },
        },
      ]
    );
  };

  const handleGeneratePDF = async () => {
    if (!tenant) return;

    try {
      await generateTenantPDF(tenant, payments);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to create PDF.');
    }
  };

  const handleSetTerminationDate = () => {
    if (!tenant) return;

    // Pre-fill with current termination date if it exists
    setTerminationDate(tenant.termination_date || new Date().toISOString().split('T')[0]);
    setTerminationModalVisible(true);
  };

  const handleSaveTerminationDate = async () => {
    if (!tenant) return;

    if (!terminationDate) {
      Alert.alert('Error', 'Please enter a date.');
      return;
    }

    try {
      await tenantAPI.updateTenant(String(tenantId), { termination_date: terminationDate });
      setTerminationModalVisible(false);
      await loadData();
      Alert.alert('Success', 'Termination date was saved.');
    } catch (error) {
      console.error('Error setting termination date:', error);
      Alert.alert('Error', 'Failed to save termination date.');
    }
  };

  const handleRemoveTerminationDate = () => {
    if (!tenant) return;

    Alert.alert(
      'Remove Termination',
      'Do you really want to remove the termination date?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await tenantAPI.updateTenant(String(tenantId), { termination_date: null });
              await loadData();
              Alert.alert('Success', 'Termination date was removed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove termination date.');
            }
          },
        },
      ]
    );
  };

  const handleOpenRenameModal = () => {
    if (!tenant) return;
    setNewTenantName(tenant.name);
    setRenameModalVisible(true);
  };

  const handleRenameTenant = async () => {
    if (!tenant) return;

    // Validation
    if (!newTenantName || newTenantName.trim() === '') {
      Alert.alert('Error', 'Tenant name cannot be empty');
      return;
    }

    if (newTenantName.trim() === tenant.name) {
      // No change
      setRenameModalVisible(false);
      return;
    }

    setIsRenamingTenant(true);
    try {
      await tenantAPI.updateTenantName(String(tenantId), newTenantName.trim());
      await loadData();
      setRenameModalVisible(false);
      Alert.alert('Success', 'Tenant name was updated successfully');
    } catch (error: any) {
      console.error('Error renaming tenant:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to rename tenant';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsRenamingTenant(false);
    }
  };

  const handleDeleteTenant = () => {
    if (!tenant) return;

    Alert.alert(
      'Delete Tenant',
      `Do you really want to permanently delete ${tenant.name}?\n\nThis will delete the tenant and all payments irreversibly.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tenantAPI.deleteTenant(String(tenantId));
              Alert.alert('Success', 'Tenant was permanently deleted.', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Dashboard'),
                },
              ]);
            } catch (error) {
              console.error('Error deleting tenant:', error);
              Alert.alert('Error', 'Failed to delete tenant.');
            }
          },
        },
      ]
    );
  };

  if (!tenant || !balance) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading tenant details...</Text>
        </View>
      </View>
    );
  }

  const saldoColor = balance.saldo > 0 ? '#EF4444' : balance.saldo < 0 ? '#10B981' : '#6B7280';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGeneratePDF} style={styles.pdfButton}>
            <Text style={styles.pdfButtonText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{tenant.name}</Text>
          {canEditTenants() && (
            <TouchableOpacity onPress={handleOpenRenameModal} style={styles.editNameButton}>
              <Text style={styles.editNameIcon}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Since {formatDate(tenant.move_in_date)}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Monthly Rate:</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance.monatlicheRate)}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Annual Rent:</Text>
            <Text style={styles.balanceValue}>{formatCurrency(tenant.annual_rent)}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Expected (total):</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance.soll)}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Actual (paid):</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance.ist)}</Text>
          </View>

          <View style={[styles.balanceRow, styles.saldoRow]}>
            <Text style={styles.saldoLabel}>Balance:</Text>
            <Text style={[styles.saldoValue, { color: saldoColor }]}>
              {formatCurrency(Math.abs(balance.saldo))}
            </Text>
          </View>

          {tenant.notes ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{tenant.notes}</Text>
            </View>
          ) : null}

          {/* Termination Date Section */}
          <View style={styles.terminationSection}>
            <View style={styles.terminationHeader}>
              <Text style={styles.terminationLabel}>Termination Date:</Text>
              {canEditTenants() && tenant.termination_date && (
                <TouchableOpacity onPress={handleRemoveTerminationDate}>
                  <Text style={styles.removeTerminationText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            {tenant.termination_date ? (
              <View style={styles.terminationRow}>
                <Text style={styles.terminationDateText}>{formatDate(tenant.termination_date)}</Text>
                {canEditTenants() && (
                  <TouchableOpacity
                    style={styles.editTerminationButton}
                    onPress={handleSetTerminationDate}
                  >
                    <Text style={styles.editTerminationButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {canEditTenants() ? (
                  <TouchableOpacity
                    style={styles.setTerminationButton}
                    onPress={handleSetTerminationDate}
                  >
                    <Text style={styles.setTerminationButtonText}>+ Set Termination Date</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noTerminationText}>Not set</Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Fiscal Years Section */}
        {fiscalYearsData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rental Years (Dec-Nov)</Text>
              <Text style={styles.sectionSubtitle}>Since {formatDate(tenant.move_in_date)}</Text>
            </View>

            {/* Loop through all fiscal years */}
            {fiscalYearsData.map((fiscalYearData, fyIndex) => (
              <View key={fiscalYearData.fiscalYear} style={fyIndex > 0 ? styles.fiscalYearSeparator : null}>
                {/* Year Total */}
                <View style={styles.fiscalYearRow}>
                  <View style={styles.fiscalYearCellContainer}>
                    <Text style={styles.fiscalYearLabel}>
                      Year {fiscalYearData.fiscalYear.replace('/', '/\n')}
                    </Text>
                  </View>
                  <View style={styles.fiscalYearValueContainer}>
                    <Text style={styles.fiscalYearValue}>{formatNumber(fiscalYearData.soll)}</Text>
                  </View>
                  <View style={styles.fiscalYearValueContainer}>
                    <Text style={styles.fiscalYearValue}>{formatNumber(fiscalYearData.ist)}</Text>
                  </View>
                  <View style={[styles.fiscalYearValueContainer, styles.lastCell]}>
                    <Text style={[
                      styles.fiscalYearValue,
                      fiscalYearData.differenz < 0 ? styles.positiveValue : styles.negativeValue
                    ]}>
                      {formatNumber(fiscalYearData.differenz)}
                    </Text>
                  </View>
                </View>

                {/* Table Header */}
                <View style={styles.fiscalTableHeader}>
                  <View style={styles.fiscalHeaderCellContainer}>
                    <Text style={styles.fiscalHeaderCell}>Period</Text>
                  </View>
                  <View style={styles.fiscalHeaderCellRightContainer}>
                    <Text style={styles.fiscalHeaderCellRight}>Exp. (AED)</Text>
                  </View>
                  <View style={styles.fiscalHeaderCellRightContainer}>
                    <Text style={styles.fiscalHeaderCellRight}>Act. (AED)</Text>
                  </View>
                  <View style={[styles.fiscalHeaderCellRightContainer, styles.lastCell]}>
                    <Text style={styles.fiscalHeaderCellRight}>Diff. (AED)</Text>
                  </View>
                </View>

                {/* Quarters and Months */}
                {fiscalYearData.quarters.map((quarter) => (
                  <View key={`${fiscalYearData.fiscalYear}-Q${quarter.quarter}`}>
                    {/* Quarter Row */}
                    <View style={styles.fiscalQuarterRow}>
                      <View style={styles.fiscalQuarterCellContainer}>
                        <Text style={styles.fiscalQuarterLabel}>{quarter.label}</Text>
                      </View>
                      <View style={styles.fiscalQuarterValueContainer}>
                        <Text style={styles.fiscalQuarterValue}>{formatNumber(quarter.soll)}</Text>
                      </View>
                      <View style={styles.fiscalQuarterValueContainer}>
                        <Text style={styles.fiscalQuarterValue}>{formatNumber(quarter.ist)}</Text>
                      </View>
                      <View style={[styles.fiscalQuarterValueContainer, styles.lastCell]}>
                        <Text style={[
                          styles.fiscalQuarterValue,
                          quarter.differenz < 0 ? styles.positiveValue : styles.negativeValue
                        ]}>
                          {formatNumber(quarter.differenz)}
                        </Text>
                      </View>
                    </View>

                    {/* Month Rows */}
                    {quarter.months.map((month) => (
                      <View key={`${month.year}-${month.month}`} style={styles.fiscalMonthRow}>
                        <View style={styles.fiscalMonthCellContainer}>
                          <Text style={styles.fiscalMonthLabel}>{month.label}</Text>
                        </View>
                        <View style={styles.fiscalMonthValueContainer}>
                          <Text style={styles.fiscalMonthValue}>{formatNumber(month.soll)}</Text>
                        </View>
                        <View style={styles.fiscalMonthValueContainer}>
                          <Text style={styles.fiscalMonthValue}>{formatNumber(month.ist)}</Text>
                        </View>
                        <View style={[styles.fiscalMonthValueContainer, styles.lastCell]}>
                          <Text style={[
                            styles.fiscalMonthValue,
                            month.differenz < 0 ? styles.positiveValue : styles.negativeValue
                          ]}>
                            {formatNumber(month.differenz)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Payments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <Text style={styles.sectionSubtitle}>{payments.length} Payments</Text>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyPayments}>
              <Text style={styles.emptyText}>No payments available</Text>
            </View>
          ) : (
            <View style={styles.paymentsList}>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.paymentItem}>
                  <View style={styles.paymentInfo}>
                    <View style={styles.paymentMainRow}>
                      <Text style={styles.paymentDate}>{formatDate(payment.payment_date)}</Text>
                      <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                    </View>
                    {payment.created_by_role && (
                      <View style={styles.paymentMetaRow}>
                        <Text style={styles.createdByLabel}>by </Text>
                        <View style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleBadgeColor(payment.created_by_role) + '20' }
                        ]}>
                          <Text style={[
                            styles.roleBadgeText,
                            { color: getRoleBadgeColor(payment.created_by_role) }
                          ]}>
                            {formatRole(payment.created_by_role)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {canAddPayments() && (
                    <TouchableOpacity
                      onPress={() => handleDeletePayment(payment.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Discrete Delete Option at the bottom - Admin Only */}
        {canDeleteTenants() && (
          <View style={styles.dangerZone}>
            <TouchableOpacity onPress={handleDeleteTenant} activeOpacity={0.7}>
              <Text style={styles.deleteTenantLink}>Permanently Delete Tenant</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Payment Button - Admin & Rent Collector Only */}
      {canAddPayments() && (
        <TouchableOpacity
          style={[styles.addButton, { marginBottom: 16 + insets.bottom }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Record Payment</Text>
        </TouchableOpacity>
      )}

      {/* Add Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Payment</Text>

            <Text style={styles.inputLabel}>Amount (AED)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={newPayment.amount}
              onChangeText={(text) => setNewPayment({ ...newPayment, amount: text })}
            />

            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={newPayment.payment_date}
              onChangeText={(text) => setNewPayment({ ...newPayment, payment_date: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddPayment}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Termination Date Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={terminationModalVisible}
        onRequestClose={() => setTerminationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Termination Date</Text>

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={terminationDate}
              onChangeText={setTerminationDate}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setTerminationModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveTerminationDate}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Tenant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={renameModalVisible}
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Tenant</Text>

            <Text style={styles.inputLabel}>Tenant Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new name"
              value={newTenantName}
              onChangeText={setNewTenantName}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleRenameTenant}
                disabled={isRenamingTenant}
              >
                {isRenamingTenant ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pdfButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editNameButton: {
    marginLeft: 12,
    padding: 4,
  },
  editNameIcon: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#DBEAFE',
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  saldoRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saldoLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saldoValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  terminationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  terminationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  terminationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  removeTerminationText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  terminationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  terminationDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  editTerminationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  editTerminationButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  setTerminationButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  setTerminationButtonText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
  noTerminationText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentsList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  paymentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  createdByLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#EF4444',
  },
  emptyPayments: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  addButton: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 40,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  deleteTenantLink: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
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
    width: '85%',
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
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
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
  saveButton: {
    backgroundColor: '#2563EB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Fiscal Year Styles
  fiscalYearSeparator: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  fiscalYearRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  fiscalYearCellContainer: {
    flex: 4,
    borderRightWidth: 1,
    borderRightColor: '#BFDBFE',
    paddingRight: 8,
  },
  fiscalYearValueContainer: {
    flex: 5,
    borderRightWidth: 1,
    borderRightColor: '#BFDBFE',
    paddingRight: 8,
    paddingLeft: 8,
  },
  fiscalYearLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  fiscalYearValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: 'right',
  },
  fiscalTableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  fiscalHeaderCellContainer: {
    flex: 4,
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
    paddingRight: 8,
  },
  fiscalHeaderCellRightContainer: {
    flex: 5,
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
    paddingRight: 8,
    paddingLeft: 8,
  },
  fiscalHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  fiscalHeaderCellRight: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'right',
  },
  fiscalQuarterRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    marginBottom: 4,
  },
  fiscalQuarterCellContainer: {
    flex: 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 8,
  },
  fiscalQuarterValueContainer: {
    flex: 5,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 8,
    paddingLeft: 8,
  },
  fiscalQuarterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  fiscalQuarterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
  fiscalMonthRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  fiscalMonthCellContainer: {
    flex: 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 8,
  },
  fiscalMonthValueContainer: {
    flex: 5,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 8,
    paddingLeft: 8,
  },
  fiscalMonthLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 16,
  },
  fiscalMonthValue: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  positiveValue: {
    color: '#10B981',
    fontWeight: '600',
  },
  negativeValue: {
    color: '#EF4444',
    fontWeight: '600',
  },
  lastCell: {
    borderRightWidth: 0,
  },
});
