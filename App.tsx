import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './src/services/database';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import {
  LoginScreen,
  RegisterScreen,
  DashboardScreen,
  TenantDetailScreen,
  AddTenantScreen,
  TeamManagementScreen,
} from './src/screens';

const Stack = createNativeStackNavigator();

/**
 * Auth Stack - for unauthenticated users
 */
const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

/**
 * App Stack - for authenticated users
 */
const AppStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="TenantDetail" component={TenantDetailScreen} />
      <Stack.Screen name="AddTenant" component={AddTenantScreen} />
      <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
    </Stack.Navigator>
  );
};

/**
 * Navigation Guard - switches between Auth and App stacks
 */
const RootNavigator = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppStack /> : <AuthStack />;
};

/**
 * Main App Component
 */
function AppContent() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        console.log('🚀 Starting database initialization...');
        await initDatabase();
        console.log('🎉 Database ready, rendering app');
        setIsDbReady(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('💥 Database initialization failed:', errorMessage);
        setDbError(errorMessage);
      }
    };

    setupDatabase();
  }, []);

  // Show loading screen while database initializes
  if (!isDbReady && !dbError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Datenbank wird initialisiert...</Text>
      </View>
    );
  }

  // Show error screen if database initialization failed
  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Datenbankfehler</Text>
        <Text style={styles.errorMessage}>{dbError}</Text>
        <Text style={styles.errorHint}>
          Bitte starten Sie die App neu.
        </Text>
      </View>
    );
  }

  // Render app with navigation guard
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

/**
 * App wrapped with AuthProvider
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
