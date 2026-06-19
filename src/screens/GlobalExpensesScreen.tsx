import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { expenseAPI, userAPI } from '../services/api';
import { getCurrentFiscalYearPeriod, getFiscalQuarter, getQuarterLabel } from '../utils/rentCalculations';
import type { Expense, User } from '../models';

interface GlobalExpensesScreenProps {
  navigation: any;
}

interface GroupedExpenses {
  quarter: number;
  label: string;
  expenses: Expense[];
  total: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getRoleBadgeColor = (role?: string): string => {
  if (!role) return '#9CA3AF';
  switch (role.toLowerCase()) {
    case 'admin':
      return '#EF4444';
    case 'rent_collector':
      return '#2563EB';
    default:
      return '#6B7280';
  }
};

const formatRole = (role?: string): string => {
  if (!role) return 'Unknown';
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Admin';
    case 'rent_collector':
      return 'Rent Collector';
    default:
      return 'Spectator';
  }
};

export default function GlobalExpensesScreen({ navigation }: GlobalExpensesScreenProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groupedExpenses, setGroupedExpenses] = useState<GroupedExpenses[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentFiscalYearPeriod().start.getFullYear() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(0); // 0 = all quarters

  // Photo viewer
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [storageStats, setStorageStats] = useState<{ total_files: number; total_size_mb: number } | null>(null);

  const loadUsers = async () => {
    try {
      const userData = await userAPI.listUsers();
      setUsers(userData);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await expenseAPI.getStorageStats();
      setStorageStats(stats);
    } catch (error: any) {
      console.error('❌ Failed to load storage stats:', error);
    }
  };

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading expenses with filters:', {
        user_id: selectedUserId === 'all' ? undefined : selectedUserId,
        year: selectedYear,
        quarter: selectedQuarter || undefined,
      });

      const filters: any = {
        year: selectedYear,
      };

      if (selectedUserId !== 'all') {
        filters.user_id = selectedUserId;
      }

      if (selectedQuarter > 0) {
        filters.quarter = selectedQuarter;
      }

      const data = await expenseAPI.getAllExpenses(filters);
      console.log(`✅ Loaded ${data.length} expenses`);
      setExpenses(data);
      groupExpensesByQuarter(data);
    } catch (error: any) {
      console.error('❌ Failed to load expenses:', error);
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const groupExpensesByQuarter = (expensesList: Expense[]) => {
    // Group by quarter
    const quarters: { [key: number]: Expense[] } = { 1: [], 2: [], 3: [], 4: [] };

    expensesList.forEach(expense => {
      const expenseDate = new Date(expense.expense_date);
      const quarter = getFiscalQuarter(expenseDate.getMonth());
      quarters[quarter].push(expense);
    });

    // Create grouped data
    const grouped: GroupedExpenses[] = [];
    for (let q = 1; q <= 4; q++) {
      if (quarters[q].length > 0) {
        const total = quarters[q].reduce((sum, exp) => sum + exp.amount, 0);
        grouped.push({
          quarter: q,
          label: getQuarterLabel(q),
          expenses: quarters[q].sort((a, b) =>
            new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
          ),
          total,
        });
      }
    }

    setGroupedExpenses(grouped);
  };

  useEffect(() => {
    loadUsers();
    loadStorageStats();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      loadExpenses();
    }
  }, [selectedUserId, selectedYear, selectedQuarter, users]);

  const handleDeleteExpense = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Delete "${expense.name}" (${formatCurrency(expense.amount)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseAPI.deleteExpense(expense.id);
              await loadExpenses();
              Alert.alert('Success', 'Expense deleted');
            } catch (error: any) {
              console.error('❌ Failed to delete expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const getUserName = (userId?: string): string => {
    if (!userId) return 'Unknown';
    const user = users.find(u => u.id === userId);
    return user ? user.email.split('@')[0] : 'Unknown';
  };

  const renderExpense = (expense: Expense) => {
    const roleColor = getRoleBadgeColor(expense.created_by_role);
    const userName = getUserName(expense.created_by_id);

    return (
      <View key={expense.id} style={styles.expenseCard}>
        <View style={styles.expenseMain}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseName}>{expense.name}</Text>
            <Text style={styles.expenseDate}>{formatDate(expense.expense_date)}</Text>
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{userName}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {formatRole(expense.created_by_role)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.expenseRight}>
            <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteExpense(expense)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        {expense.photo_paths && expense.photo_paths.length > 0 && (
          <View style={styles.receiptPhotosContainer}>
            <Text style={styles.receiptLabel}>📎 Receipts ({expense.photo_paths.length}):</Text>
            <View style={styles.receiptPhotosRow}>
              {expense.photo_paths.map((filename, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedPhotoUrl(expenseAPI.getPhotoUrl(filename));
                    setPhotoViewerVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: expenseAPI.getPhotoUrl(filename) }}
                    style={styles.receiptPhoto}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderQuarterSection = (group: GroupedExpenses) => (
    <View key={group.quarter} style={styles.quarterSection}>
      <View style={styles.quarterHeader}>
        <Text style={styles.quarterLabel}>{group.label}</Text>
        <View style={styles.quarterStats}>
          <Text style={styles.quarterCount}>{group.expenses.length} expenses</Text>
          <Text style={styles.quarterTotal}>{formatCurrency(group.total)}</Text>
        </View>
      </View>
      {group.expenses.map(renderExpense)}
    </View>
  );

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Expenses (Admin)</Text>
        <Text style={styles.subtitle}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} • {formatCurrency(totalExpenses)}
        </Text>
        {storageStats && (
          <Text style={styles.storageInfo}>
            📎 {storageStats.total_files} photo{storageStats.total_files !== 1 ? 's' : ''} • {storageStats.total_size_mb} MB
          </Text>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filters</Text>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Team Member</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedUserId}
                onValueChange={(value) => setSelectedUserId(value)}
                style={styles.picker}
              >
                <Picker.Item label="All Members" value="all" />
                {users.map(user => (
                  <Picker.Item
                    key={user.id}
                    label={user.email.split('@')[0]}
                    value={user.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={[styles.filterItem, { flex: 1 }]}>
            <Text style={styles.filterLabel}>Lease Year</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => setSelectedYear(value)}
                style={styles.picker}
              >
                {years.map(year => (
                  <Picker.Item key={year} label={`${year}`} value={year} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={[styles.filterItem, { flex: 1 }]}>
            <Text style={styles.filterLabel}>Quarter</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedQuarter}
                onValueChange={(value) => setSelectedQuarter(value)}
                style={styles.picker}
              >
                <Picker.Item label="All Quarters" value={0} />
                <Picker.Item label="Q1 (Dez-Feb)" value={1} />
                <Picker.Item label="Q2 (Mär-Mai)" value={2} />
                <Picker.Item label="Q3 (Jun-Aug)" value={3} />
                <Picker.Item label="Q4 (Sep-Nov)" value={4} />
              </Picker>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {groupedExpenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No expenses found</Text>
              <Text style={styles.emptySubtext}>Try adjusting the filters</Text>
            </View>
          ) : (
            <>
              {groupedExpenses.map(renderQuarterSection)}
              <View style={{ height: 40 }} />
            </>
          )}
        </ScrollView>
      )}

      {/* Photo Viewer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={photoViewerVisible}
        onRequestClose={() => setPhotoViewerVisible(false)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.photoViewerCloseButton}
            onPress={() => setPhotoViewerVisible(false)}
          >
            <Text style={styles.photoViewerCloseText}>✕ Close</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: selectedPhotoUrl }}
            style={styles.photoViewerImage}
            resizeMode="contain"
          />
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
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  storageInfo: {
    fontSize: 12,
    color: '#DBEAFE',
    marginTop: 4,
    opacity: 0.8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  quarterSection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  quarterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 8,
  },
  quarterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  quarterStats: {
    alignItems: 'flex-end',
  },
  quarterCount: {
    fontSize: 12,
    color: '#1E40AF',
    marginBottom: 2,
  },
  quarterTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorName: {
    fontSize: 12,
    color: '#6B7280',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  receiptPhotosContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  receiptLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  receiptPhotosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 10,
  },
  photoViewerCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
});
