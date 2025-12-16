import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Index() {
  const { isAuthenticated, isLoading, role, logout } = useAuth();

  const handleLogout = async () => {
      await logout();
      return <Redirect href="/login" />;
    };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  switch (role) {
    case 'landlord':
      return <Redirect href="/(landlord)" />;
    case 'admin':
      return <Redirect href="/(admin)" />;
    case 'user':
      return <Redirect href="/(normal)" />;
    default:
      handleLogout();
  }
}