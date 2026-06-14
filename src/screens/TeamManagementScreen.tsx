import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth, type UserRole } from '../contexts/AuthContext';

interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

// Mock team members (replace with API call later)
const MOCK_TEAM: TeamMember[] = [
  { id: '1', email: 'admin@test.com', role: 'admin', name: 'Admin User' },
  { id: '2', email: 'collector@test.com', role: 'rent_collector', name: 'Rent Collector' },
  { id: '3', email: 'spectator@test.com', role: 'spectator', name: 'Spectator User' },
];

interface TeamManagementScreenProps {
  navigation: any;
}

export default function TeamManagementScreen({ navigation }: TeamManagementScreenProps) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(MOCK_TEAM);
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'spectator' | 'rent_collector'>('spectator');

  const handleInviteUser = () => {
    if (!inviteEmail) {
      Alert.alert('Fehler', 'Bitte E-Mail-Adresse eingeben');
      return;
    }

    // TODO: Replace with API call
    const newMember: TeamMember = {
      id: Date.now().toString(),
      email: inviteEmail,
      role: inviteRole,
    };

    setTeamMembers([...teamMembers, newMember]);
    setModalVisible(false);
    setInviteEmail('');
    setInviteRole('spectator');

    Alert.alert('Erfolg', `Einladung an ${inviteEmail} wurde versendet`);
  };

  const handleRemoveMember = (member: TeamMember) => {
    if (member.role === 'admin') {
      Alert.alert('Fehler', 'Admins können nicht entfernt werden');
      return;
    }

    Alert.alert(
      'Benutzer entfernen',
      `Möchten Sie ${member.name || member.email} wirklich entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => {
            // TODO: Replace with API call
            setTeamMembers(teamMembers.filter(m => m.id !== member.id));
          },
        },
      ]
    );
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

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name || item.email}</Text>
          <Text style={styles.memberEmail}>{item.name ? item.email : ''}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
        </View>
        {item.role !== 'admin' && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Team Verwaltung</Text>
        <Text style={styles.subtitle}>{teamMembers.length} Mitglieder</Text>
      </View>

      {/* Team List */}
      <FlatList
        data={teamMembers}
        renderItem={renderTeamMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Keine Teammitglieder</Text>
          </View>
        }
      />

      {/* Invite Button */}
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.inviteButtonText}>+ Benutzer einladen</Text>
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
            <Text style={styles.modalTitle}>Benutzer einladen</Text>

            <Text style={styles.inputLabel}>E-Mail-Adresse</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Rolle</Text>
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
                <Text style={styles.roleOptionDesc}>Nur lesen</Text>
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
                <Text style={styles.roleOptionDesc}>Zahlungen erfassen</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleInviteUser}
              >
                <Text style={styles.sendButtonText}>Einladen</Text>
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
  inviteButton: {
    position: 'absolute',
    bottom: 20,
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
});
