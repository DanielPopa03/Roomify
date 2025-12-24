import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Index() {
  const { isAuthenticated, isLoading, role, isProfileComplete, logout } = useAuth(); // <--- Get isProfileComplete

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

  // 1. Not Authenticated -> Login
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // 2. Authenticated but Profile Incomplete -> Setup Screen
  if (!isProfileComplete) {
    return <Redirect href="/complete-profile" />;
  }

  // 3. Authenticated & Complete -> Role Dashboard
  switch (role) {
    case 'landlord':
      return <Redirect href="/(landlord)" />;
    case 'admin':
      return <Redirect href="/(admin)" />;
    case 'user':
      return <Redirect href="/(normal)" />;
    default:
      // Unknown role fallback
      return <Redirect href="/(normal)" />;
  }
}