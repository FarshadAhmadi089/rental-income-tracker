import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import {
  LoginScreen,
  RegisterScreen,
  DashboardScreen,
  TenantDetailScreen,
  AddTenantScreen,
  TeamManagementScreen,
} from './src/screens';
import CollectorStatsScreen from './src/screens/CollectorStatsScreen';

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
      <Stack.Screen name="CollectorStats" component={CollectorStatsScreen} />
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
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

/**
 * App wrapped with SafeAreaProvider and AuthProvider
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
