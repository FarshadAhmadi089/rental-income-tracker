import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { formatLastSeen } from '../utils/timeUtils';

interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  last_seen?: string | null;
}

interface TeamManagementScreenProps {
  navigation: any;
}

export default function TeamManagementScreen({ navigation }: TeamManagementScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'spectator' | 'rent_collector'>('spectator');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Password change modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /**
   * Fetch all users from the API
   */
  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching all users from API...');
      const users = await userAPI.listUsers();
      console.log('✅ Fetched users:', users);

      // Map backend response to TeamMember format
      const mappedUsers: TeamMember[] = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name || u.email.split('@')[0],
        last_seen: u.last_seen || null,
      }));

      setTeamMembers(mappedUsers);
    } catch (error: any) {
      console.error('❌ Failed to fetch users:', error);
      Alert.alert(
        'Error',
        'Failed to load users. Please try again.'
      );
    } finally {
      setIsLoadingUsers(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
  };

  /**
   * Fetch users when screen is focused and set up auto-refresh
   * Stops polling when user navigates away
   */
  useFocusEffect(
    React.useCallback(() => {
      // Initial fetch when screen becomes focused
      fetchUsers();

      // Auto-refresh every 30 seconds while screen is focused
      const interval = setInterval(() => {
        fetchUsers();
      }, 30000); // 30 seconds

      // Cleanup: stop polling when screen loses focus or unmounts
      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  const handleInviteUser = async () => {
    // Validate inputs
    if (!inviteEmail) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }

    if (!invitePassword) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    if (invitePassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    console.log('📧 Attempting to invite user:', {
      email: inviteEmail,
      role: inviteRole,
    });

    try {
      // Call API to create user
      const newUser = await userAPI.createUser(inviteEmail, invitePassword, inviteRole);
      console.log('✅ User created successfully:', newUser);

      // Close modal and reset form
      setModalVisible(false);
      setInviteEmail('');
      setInvitePassword('');
      setInviteRole('spectator');

      // Refresh the user list to show the new user
      await fetchUsers();

      Alert.alert('Success', `Invitation sent to ${inviteEmail}`);
    } catch (error: any) {
      console.error('❌ Failed to invite user:', error);

      const errorMessage = error.response?.data?.detail ||
                          error.message ||
                          'Failed to invite user';

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    // Prevent deleting yourself
    if (user && member.id === user.id) {
      Alert.alert('Error', 'Cannot remove yourself');
      return;
    }

    // Prevent deleting admins (optional, can be removed if you want to allow it)
    if (member.role === 'admin') {
      Alert.alert('Error', 'Admins cannot be removed');
      return;
    }

    Alert.alert(
      'Remove User',
      `Do you really want to remove ${member.name || member.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingUserId(member.id);
            console.log('🗑️ Attempting to delete user:', member.email);

            try {
              await userAPI.deleteUser(member.id);
              console.log('✅ User deleted successfully');

              // Refresh the user list
              await fetchUsers();

              Alert.alert('Success', `${member.email} was removed`);
            } catch (error: any) {
              console.error('❌ Failed to delete user:', error);

              const errorMessage = error.response?.data?.detail ||
                                  error.message ||
                                  'Failed to remove user';

              Alert.alert('Error', errorMessage);
            } finally {
              setDeletingUserId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenPasswordModal = (member: TeamMember) => {
    setSelectedUserId(member.id);
    setSelectedUserEmail(member.email);
    setPasswordModalVisible(true);
  };

  const handleChangePasswordForUser = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!selectedUserId) {
      Alert.alert('Error', 'No user selected');
      return;
    }

    setIsChangingPassword(true);
    try {
      await userAPI.changeUserPassword(selectedUserId, newPassword);
      Alert.alert('Success', `Password changed for ${selectedUserEmail}`);
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUserId(null);
      setSelectedUserEmail('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to change password';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'rent_collector':
        return 'Rent Collector';
      case 'spectator':
        return 'Spectator';
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return '#EF4444';
      case 'rent_collector':
        return '#2563EB';
      case 'spectator':
        return '#6B7280';
    }
  };

  const renderTeamMember = ({ item }: { item: TeamMember }) => {
    const roleColor = getRoleColor(item.role);
    const isDeleting = deletingUserId === item.id;
    const isCurrentUser = user && item.id === user.id;
    const activityStatus = formatLastSeen(item.last_seen);

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.memberName}>{item.name || item.email}</Text>
            {isCurrentUser && (
              <Text style={styles.youBadge}> (Sie)</Text>
            )}
          </View>
          <Text style={styles.memberEmail}>{item.email}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>
                {getRoleLabel(item.role)}
              </Text>
            </View>
            {/* Activity status indicator */}
            <View style={styles.activityContainer}>
              <View style={[styles.activityDot, { backgroundColor: activityStatus.color }]} />
              <Text style={styles.activityText}>{activityStatus.text}</Text>
            </View>
          </View>
        </View>
        <View style={styles.actionButtons}>
          {/* View Stats button - only for rent collectors */}
          {item.role === 'rent_collector' && (
            <TouchableOpacity
              style={styles.statsButton}
              onPress={() => navigation.navigate('CollectorStats', {
                userId: item.id,
                userName: item.name || item.email
              })}
              activeOpacity={0.7}
            >
              <Text style={styles.statsButtonText}>📊</Text>
            </TouchableOpacity>
          )}
          {/* Password and remove buttons - only for non-admin, non-current users */}
          {!isCurrentUser && item.role !== 'admin' && (
            <>
              <TouchableOpacity
                style={styles.passwordButton}
                onPress={() => handleOpenPasswordModal(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.passwordButtonText}>🔐</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMember(item)}
                activeOpacity={0.7}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text style={styles.removeButtonText}>🗑️</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Team Management</Text>
        <Text style={styles.subtitle}>{teamMembers.length} Members</Text>
      </View>

      {/* Team List */}
      {isLoadingUsers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={teamMembers}
          renderItem={renderTeamMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No team members</Text>
            </View>
          }
        />
      )}

      {/* Invite Button */}
      <TouchableOpacity
        style={[styles.inviteButton, { bottom: 20 + insets.bottom }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.inviteButtonText}>+ Invite User</Text>
      </TouchableOpacity>

      {/* Invite Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite User</Text>

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              value={invitePassword}
              onChangeText={setInvitePassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  inviteRole === 'spectator' && styles.roleOptionSelected,
                ]}
                onPress={() => setInviteRole('spectator')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    inviteRole === 'spectator' && styles.roleOptionTextSelected,
                  ]}
                >
                  Spectator
                </Text>
                <Text style={styles.roleOptionDesc}>Read only</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  inviteRole === 'rent_collector' && styles.roleOptionSelected,
                ]}
                onPress={() => setInviteRole('rent_collector')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    inviteRole === 'rent_collector' && styles.roleOptionTextSelected,
                  ]}
                >
                  Rent Collector
                </Text>
                <Text style={styles.roleOptionDesc}>Record payments</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleInviteUser}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Invite</Text>
                )}
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
            <Text style={styles.modalSubtitle}>{selectedUserEmail}</Text>

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

            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat new password"
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
                  setNewPassword('');
                  setConfirmPassword('');
                  setSelectedUserId(null);
                  setSelectedUserEmail('');
                }}
                disabled={isChangingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleChangePasswordForUser}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Change</Text>
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statsButton: {
    padding: 8,
  },
  statsButtonText: {
    fontSize: 20,
  },
  passwordButton: {
    padding: 8,
  },
  passwordButtonText: {
    fontSize: 20,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 20,
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  youBadge: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  inviteButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  inviteButtonText: {
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
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
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
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  roleOptionTextSelected: {
    color: '#2563EB',
  },
  roleOptionDesc: {
    fontSize: 11,
    color: '#6B7280',
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
  sendButton: {
    backgroundColor: '#2563EB',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  activityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activityText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
