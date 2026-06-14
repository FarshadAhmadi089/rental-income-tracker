import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './src/services/database';
import { DashboardScreen, TenantDetailScreen, AddTenantScreen } from './src/screens';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize database on app startup
    try {
      initDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="TenantDetail" component={TenantDetailScreen} />
        <Stack.Screen name="AddTenant" component={AddTenantScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
