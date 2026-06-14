import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTenantById, getPaymentsByTenantId, createPayment, deletePayment } from '../services/database';
import { getTenantBalance, formatCurrency, formatDate } from '../services/calculationService';
import { generateTenantPDF } from '../services/pdfService';
import { Tenant, Payment, PaymentInput } from '../models';

interface TenantDetailScreenProps {
  route: any;
  navigation: any;
}

export default function TenantDetailScreen({ route, navigation }: TenantDetailScreenProps) {
  const { tenantId } = route.params;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPayment, setNewPayment] = useState({
    betrag: '',
    datum: new Date().toISOString().split('T')[0], // Today's date
  });

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
        </View>

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
});
