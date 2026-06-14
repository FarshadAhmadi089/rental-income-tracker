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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTenantById, getPaymentsByTenantId, createPayment, deletePayment, updateTenant, deleteTenantPermanently } from '../services/database';
import { getTenantBalance, formatCurrency, formatDate } from '../services/calculationService';
import { generateTenantPDF } from '../services/pdfService';
import { calculateFiscalYearData } from '../utils/rentCalculations';
import type { Tenant, Payment, PaymentInput } from '../models';
import type { FiscalYearData } from '../utils/rentCalculations';

interface TenantDetailScreenProps {
  route: any;
  navigation: any;
}

export default function TenantDetailScreen({ route, navigation }: TenantDetailScreenProps) {
  const { tenantId } = route.params;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [fiscalYearsData, setFiscalYearsData] = useState<FiscalYearData[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [terminationModalVisible, setTerminationModalVisible] = useState(false);
  const [newPayment, setNewPayment] = useState({
    betrag: '',
    datum: new Date().toISOString().split('T')[0], // Today's date
  });
  const [terminationDate, setTerminationDate] = useState('');

  const loadData = useCallback(() => {
    try {
      const tenantData = getTenantById(tenantId);
      if (!tenantData) {
        Alert.alert('Fehler', 'Mieter nicht gefunden');
        navigation.goBack();
        return;
      }

      setTenant(tenantData);
      const paymentsData = getPaymentsByTenantId(tenantId);
      setPayments(paymentsData);
      const balanceData = getTenantBalance(tenantData);
      setBalance(balanceData);
      const fiscalData = calculateFiscalYearData(tenantData, paymentsData);
      setFiscalYearsData(fiscalData);
    } catch (error) {
      console.error('Error loading tenant details:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden.');
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

  const handleAddPayment = () => {
    if (!newPayment.betrag || parseFloat(newPayment.betrag) <= 0) {
      Alert.alert('Fehler', 'Bitte geben Sie einen gültigen Betrag ein.');
      return;
    }

    try {
      const paymentInput: PaymentInput = {
        mieter_id: tenantId,
        datum: newPayment.datum,
        betrag: parseFloat(newPayment.betrag),
      };

      createPayment(paymentInput);
      setModalVisible(false);
      setNewPayment({
        betrag: '',
        datum: new Date().toISOString().split('T')[0],
      });
      loadData();
      Alert.alert('Erfolg', 'Zahlung wurde erfasst.');
    } catch (error) {
      console.error('Error adding payment:', error);
      Alert.alert('Fehler', 'Zahlung konnte nicht erfasst werden.');
    }
  };

  const handleDeletePayment = (paymentId: number) => {
    Alert.alert(
      'Zahlung löschen',
      'Möchten Sie diese Zahlung wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            try {
              deletePayment(paymentId);
              loadData();
            } catch (error) {
              Alert.alert('Fehler', 'Zahlung konnte nicht gelöscht werden.');
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
      Alert.alert('Fehler', 'PDF konnte nicht erstellt werden.');
    }
  };

  const handleSetTerminationDate = () => {
    if (!tenant) return;

    // Pre-fill with current termination date if it exists
    setTerminationDate(tenant.termination_date || new Date().toISOString().split('T')[0]);
    setTerminationModalVisible(true);
  };

  const handleSaveTerminationDate = () => {
    if (!tenant) return;

    if (!terminationDate) {
      Alert.alert('Fehler', 'Bitte geben Sie ein Datum ein.');
      return;
    }

    try {
      updateTenant(tenantId, { termination_date: terminationDate });
      setTerminationModalVisible(false);
      loadData();
      Alert.alert('Erfolg', 'Kündigungsdatum wurde gespeichert.');
    } catch (error) {
      console.error('Error setting termination date:', error);
      Alert.alert('Fehler', 'Kündigungsdatum konnte nicht gespeichert werden.');
    }
  };

  const handleRemoveTerminationDate = () => {
    if (!tenant) return;

    Alert.alert(
      'Kündigung entfernen',
      'Möchten Sie das Kündigungsdatum wirklich entfernen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => {
            try {
              updateTenant(tenantId, { termination_date: null });
              loadData();
              Alert.alert('Erfolg', 'Kündigungsdatum wurde entfernt.');
            } catch (error) {
              Alert.alert('Fehler', 'Kündigungsdatum konnte nicht entfernt werden.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteTenant = () => {
    if (!tenant) return;

    Alert.alert(
      'Mieter löschen',
      `Möchten Sie ${tenant.name} wirklich dauerhaft löschen?\n\nDies löscht den Mieter und alle Zahlungen unwiderruflich.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Dauerhaft löschen',
          style: 'destructive',
          onPress: () => {
            try {
              deleteTenantPermanently(tenantId);
              Alert.alert('Erfolg', 'Mieter wurde dauerhaft gelöscht.', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Dashboard'),
                },
              ]);
            } catch (error) {
              console.error('Error deleting tenant:', error);
              Alert.alert('Fehler', 'Mieter konnte nicht gelöscht werden.');
            }
          },
        },
      ]
    );
  };

  if (!tenant || !balance) {
    return (
      <View style={styles.container}>
        <Text>Laden...</Text>
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
            <Text style={styles.backButtonText}>← Zurück</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGeneratePDF} style={styles.pdfButton}>
            <Text style={styles.pdfButtonText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{tenant.name}</Text>
        <Text style={styles.subtitle}>Seit {formatDate(tenant.mietanfang_datum)}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Monatliche Rate:</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance.monatlicheRate)}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Jahresmiete:</Text>
            <Text style={styles.balanceValue}>{formatCurrency(tenant.jahresmiete)}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Soll (gesamt):</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance.soll)}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Ist (bezahlt):</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance.ist)}</Text>
          </View>

          <View style={[styles.balanceRow, styles.saldoRow]}>
            <Text style={styles.saldoLabel}>Saldo:</Text>
            <Text style={[styles.saldoValue, { color: saldoColor }]}>
              {formatCurrency(Math.abs(balance.saldo))}
            </Text>
          </View>

          {tenant.anmerkungen ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Anmerkungen:</Text>
              <Text style={styles.notesText}>{tenant.anmerkungen}</Text>
            </View>
          ) : null}

          {/* Termination Date Section */}
          <View style={styles.terminationSection}>
            <View style={styles.terminationHeader}>
              <Text style={styles.terminationLabel}>Kündigungsdatum:</Text>
              {tenant.termination_date && (
                <TouchableOpacity onPress={handleRemoveTerminationDate}>
                  <Text style={styles.removeTerminationText}>Entfernen</Text>
                </TouchableOpacity>
              )}
            </View>
            {tenant.termination_date ? (
              <View style={styles.terminationRow}>
                <Text style={styles.terminationDateText}>{formatDate(tenant.termination_date)}</Text>
                <TouchableOpacity
                  style={styles.editTerminationButton}
                  onPress={handleSetTerminationDate}
                >
                  <Text style={styles.editTerminationButtonText}>Bearbeiten</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.setTerminationButton}
                onPress={handleSetTerminationDate}
              >
                <Text style={styles.setTerminationButtonText}>+ Kündigungsdatum setzen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Fiscal Years Section */}
        {fiscalYearsData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mietjahre (Dez-Nov)</Text>
              <Text style={styles.sectionSubtitle}>Seit {formatDate(tenant.mietanfang_datum)}</Text>
            </View>

            {/* Loop through all fiscal years */}
            {fiscalYearsData.map((fiscalYearData, fyIndex) => (
              <View key={fiscalYearData.fiscalYear} style={fyIndex > 0 ? styles.fiscalYearSeparator : null}>
                {/* Year Total */}
                <View style={styles.fiscalYearRow}>
                  <Text style={styles.fiscalYearLabel}>Mietjahr {fiscalYearData.fiscalYear}</Text>
                  <Text style={styles.fiscalYearValue}>{formatCurrency(fiscalYearData.soll)}</Text>
                  <Text style={styles.fiscalYearValue}>{formatCurrency(fiscalYearData.ist)}</Text>
                  <Text style={[
                    styles.fiscalYearValue,
                    fiscalYearData.differenz < 0 ? styles.positiveValue : styles.negativeValue
                  ]}>
                    {formatCurrency(fiscalYearData.differenz)}
                  </Text>
                </View>

                {/* Table Header */}
                <View style={styles.fiscalTableHeader}>
                  <Text style={styles.fiscalHeaderCell}>Zeitraum</Text>
                  <Text style={styles.fiscalHeaderCellRight}>Soll</Text>
                  <Text style={styles.fiscalHeaderCellRight}>Ist</Text>
                  <Text style={styles.fiscalHeaderCellRight}>Diff.</Text>
                </View>

                {/* Quarters and Months */}
                {fiscalYearData.quarters.map((quarter) => (
                  <View key={`${fiscalYearData.fiscalYear}-Q${quarter.quarter}`}>
                    {/* Quarter Row */}
                    <View style={styles.fiscalQuarterRow}>
                      <Text style={styles.fiscalQuarterLabel}>{quarter.label}</Text>
                      <Text style={styles.fiscalQuarterValue}>{formatCurrency(quarter.soll)}</Text>
                      <Text style={styles.fiscalQuarterValue}>{formatCurrency(quarter.ist)}</Text>
                      <Text style={[
                        styles.fiscalQuarterValue,
                        quarter.differenz < 0 ? styles.positiveValue : styles.negativeValue
                      ]}>
                        {formatCurrency(quarter.differenz)}
                      </Text>
                    </View>

                    {/* Month Rows */}
                    {quarter.months.map((month) => (
                      <View key={`${month.year}-${month.month}`} style={styles.fiscalMonthRow}>
                        <Text style={styles.fiscalMonthLabel}>{month.label}</Text>
                        <Text style={styles.fiscalMonthValue}>{formatCurrency(month.soll)}</Text>
                        <Text style={styles.fiscalMonthValue}>{formatCurrency(month.ist)}</Text>
                        <Text style={[
                          styles.fiscalMonthValue,
                          month.differenz < 0 ? styles.positiveValue : styles.negativeValue
                        ]}>
                          {formatCurrency(month.differenz)}
                        </Text>
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
            <Text style={styles.sectionTitle}>Zahlungshistorie</Text>
            <Text style={styles.sectionSubtitle}>{payments.length} Zahlungen</Text>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyPayments}>
              <Text style={styles.emptyText}>Keine Zahlungen vorhanden</Text>
            </View>
          ) : (
            <View style={styles.paymentsList}>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.paymentItem}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentDate}>{formatDate(payment.datum)}</Text>
                    <Text style={styles.paymentAmount}>{formatCurrency(payment.betrag)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeletePayment(payment.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Discrete Delete Option at the bottom */}
        <View style={styles.dangerZone}>
          <TouchableOpacity onPress={handleDeleteTenant} activeOpacity={0.7}>
            <Text style={styles.deleteTenantLink}>Mieter dauerhaft löschen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Payment Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ Zahlung erfassen</Text>
      </TouchableOpacity>

      {/* Add Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Neue Zahlung</Text>

            <Text style={styles.inputLabel}>Betrag (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={newPayment.betrag}
              onChangeText={(text) => setNewPayment({ ...newPayment, betrag: text })}
            />

            <Text style={styles.inputLabel}>Datum</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={newPayment.datum}
              onChangeText={(text) => setNewPayment({ ...newPayment, datum: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddPayment}
              >
                <Text style={styles.saveButtonText}>Speichern</Text>
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
            <Text style={styles.modalTitle}>Kündigungsdatum</Text>

            <Text style={styles.inputLabel}>Datum (YYYY-MM-DD)</Text>
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
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveTerminationDate}
              >
                <Text style={styles.saveButtonText}>Speichern</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    margin: 16,
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  fiscalYearLabel: {
    flex: 2,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  fiscalYearValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: 'right',
  },
  fiscalTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  fiscalHeaderCell: {
    flex: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  fiscalHeaderCellRight: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'right',
  },
  fiscalQuarterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    marginBottom: 4,
  },
  fiscalQuarterLabel: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  fiscalQuarterValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
  fiscalMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingLeft: 32,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    marginLeft: 12,
    marginBottom: 2,
  },
  fiscalMonthLabel: {
    flex: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  fiscalMonthValue: {
    flex: 1,
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
});
