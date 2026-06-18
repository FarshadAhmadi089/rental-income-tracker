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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { tenantAPI, paymentAPI, userAPI } from '../services/api';
import { getAllTenantBalances, formatCurrency } from '../services/calculationService';
import { calculateGlobalQuarterlyReport, getAvailableLeaseYears, getAvailableQuarters } from '../utils/rentCalculations';
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
  const { user, logout, canEditTenants, canManageTeam } = useAuth();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<TenantSection[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(1);

  // Password change modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tenantsData, allPayments] = await Promise.all([
        tenantAPI.listTenants(),
        paymentAPI.listPayments()
      ]);
      setTenants(tenantsData);
      const balancesData = getAllTenantBalances(tenantsData, allPayments);

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
        newSections.push({ title: 'Active Tenants', data: active });
      }

      if (former.length > 0) {
        newSections.push({ title: 'Former Tenants', data: former });
      }

      setSections(newSections);
    } catch (error) {
      console.error('Error loading tenants:', error);
      Alert.alert('Error', 'Failed to load tenants. Please check your internet connection.');
    } finally {
      setIsLoading(false);
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
    await loadData();
    setRefreshing(false);
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      await userAPI.changeOwnPassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');

      // Close modal and reset fields
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to change password';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleGenerateGlobalReport = async () => {
    try {
      const [tenants, allPayments] = await Promise.all([
        tenantAPI.listTenants(),
        paymentAPI.listPayments()
      ]);

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
    const saldoText = item.saldo > 0 ? 'Overdue' : item.saldo < 0 ? 'Credit' : 'Balanced';

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
            <Text style={styles.label}>Monthly Rate:</Text>
            <Text style={styles.value}>{formatCurrency(item.monatlicheRate)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Expected (total):</Text>
            <Text style={styles.value}>{formatCurrency(item.soll)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Actual (paid):</Text>
            <Text style={styles.value}>{formatCurrency(item.ist)}</Text>
          </View>

          <View style={[styles.infoRow, styles.saldoRow]}>
            <Text style={styles.labelBold}>Balance:</Text>
            <Text style={[styles.valueBold, { color: saldoColor }]}>
              {formatCurrency(Math.abs(item.saldo))}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Generate year options based on tenant move-in dates
  const yearOptions = getAvailableLeaseYears(tenants);

  // Generate quarter options based on selected year and tenant data
  const quarterOptions = getAvailableQuarters(tenants, selectedYear);

  // Calculate total tenants
  const totalTenants = sections.reduce((sum, section) => sum + section.data.length, 0);

  // Show loading indicator on initial load
  if (isLoading && sections.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.userBar}>
            <View>
              <Text style={styles.userName}>{user?.name || user?.email}</Text>
              <Text style={styles.userRole}>
                {user?.role === 'admin' ? 'Admin' : user?.role === 'rent_collector' ? 'Rent Collector' : 'Spectator'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>Rental Income</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading tenants...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* User Info & Logout */}
        <View style={styles.userBar}>
          <View>
            <Text style={styles.userName}>{user?.name || user?.email}</Text>
            <Text style={styles.userRole}>
              {user?.role === 'admin' ? 'Admin' : user?.role === 'rent_collector' ? 'Rent Collector' : 'Spectator'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {canManageTeam() && (
              <TouchableOpacity
                style={styles.teamButton}
                onPress={() => navigation.navigate('TeamManagement')}
                activeOpacity={0.7}
              >
                <Text style={styles.teamButtonText}>👥</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.passwordButton}
              onPress={() => setPasswordModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.passwordButtonText}>🔐</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={logout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title & Report Button */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Rental Income</Text>
            <Text style={styles.subtitle}>{totalTenants} Tenants</Text>
          </View>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.reportButtonText}>📊 Report</Text>
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
            <Text style={styles.emptyText}>No tenants available</Text>
            <Text style={styles.emptySubtext}>
              Add your first tenant
            </Text>
          </View>
        }
      />

      {/* Add Tenant FAB - Only for Admin & Rent Collector */}
      {canEditTenants() && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 20 + insets.bottom }]}
          onPress={() => navigation.navigate('AddTenant')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

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
              {[1, 2, 3, 4].map((q) => {
                const isAvailable = quarterOptions.includes(q);
                return (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.quarterButton,
                      selectedQuarter === q && styles.quarterButtonSelected,
                      !isAvailable && styles.quarterButtonDisabled,
                    ]}
                    onPress={() => isAvailable && setSelectedQuarter(q)}
                    disabled={!isAvailable}
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
                );
              })}
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

      {/* Password Change Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isChangingPassword}
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isChangingPassword}
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isChangingPassword}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isChangingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.generateButton]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.generateButtonText}>Change Password</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userRole: {
    fontSize: 12,
    color: '#DBEAFE',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  teamButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  teamButtonText: {
    fontSize: 18,
  },
  passwordButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  passwordButtonText: {
    fontSize: 18,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
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
  quarterButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.5,
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
