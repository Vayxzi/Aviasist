import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#e67e22',
      tabBarInactiveTintColor: '#7f8c8d',
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, elevation: 5 }
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Predicción',
          tabBarIcon: ({ color }) => <Ionicons name="calculator" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="clientes" 
        options={{ 
          title: 'Directorio',
          tabBarIcon: ({ color }) => <Ionicons name="book" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="dashboard" 
        options={{ 
          title: 'Historial',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />
        }} 
      />
    </Tabs>
  );
}