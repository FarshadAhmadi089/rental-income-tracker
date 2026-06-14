import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createTenant } from '../services/database';
import type { TenantInput } from '../models';

interface AddTenantScreenProps {
  navigation: any;
}

export default function AddTenantScreen({ navigation }: AddTenantScreenProps) {
  const [formData, setFormData] = useState<TenantInput>({
    name: '',
    mietanfang_datum: new Date().toISOString().split('T')[0],
    jahresmiete: 0,
    anmerkungen: '',
  });

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }

    if (!formData.mietanfang_datum) {
      Alert.alert('Error', 'Please enter a start date.');
      return;
    }

    if (formData.jahresmiete <= 0) {
      Alert.alert('Error', 'Please enter a valid annual rent.');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.mietanfang_datum)) {
      Alert.alert('Error', 'Date must be in YYYY-MM-DD format.');
      return;
    }

    try {
      createTenant(formData);
      Alert.alert('Success', 'Tenant was successfully added.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error creating tenant:', error);
      Alert.alert('Error', 'Tenant could not be created.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Tenant</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Move-in Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g. 2024-01-01)"
              value={formData.mietanfang_datum}
              onChangeText={(text) => setFormData({ ...formData, mietanfang_datum: text })}
            />
            <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Annual Rent (AED) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 12000"
              keyboardType="decimal-pad"
              value={formData.jahresmiete ? String(formData.jahresmiete) : ''}
              onChangeText={(text) => {
                const value = parseFloat(text) || 0;
                setFormData({ ...formData, jahresmiete: value });
              }}
            />
            <Text style={styles.hint}>
              Monthly Rate: AED {(formData.jahresmiete / 12).toFixed(2)}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional notes..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.anmerkungen}
              onChangeText={(text) => setFormData({ ...formData, anmerkungen: text })}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Add Tenant</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
