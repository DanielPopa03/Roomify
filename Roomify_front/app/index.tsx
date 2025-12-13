import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useCurrentUser } from '../hooks/useApi';
import { Blue } from '../constants/theme';
import { useEffect, useState } from 'react';

export default function Index() {
  const { user: authUser, isLoading: authLoading, isAuthenticated, error } = useAuth();
  const { user: backendUser, isLoading: userLoading } = useCurrentUser();
  const { role, setRole } = useRole();
  const [needsTokenSetup, setNeedsTokenSetup] = useState(false);

  // Check if mobile needs token setup
  useEffect(() => {
    const checkMobileAuth = async () => {
      if (Platform.OS !== 'web' && !authLoading && error) {
        // Check if error is about missing token (matches "No auth token configured. Please set up mobile auth.")
        if (error.message.includes('auth token') || error.message.includes('set up mobile')) {
          setNeedsTokenSetup(true);
        }
      }
    };
    checkMobileAuth();
  }, [authLoading, error]);

  // Redirect to token setup if needed
  if (needsTokenSetup) {
    return <Redirect href="/token-setup" />;
  }

  // 1. Show a spinner while Auth0 checks if we have a saved token
  if (authLoading || userLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={Blue[600]} />
      </View>
    );
  }

  if (!isAuthenticated || !authUser) {
    return <Redirect href="/login" />;
  }

  // If backend user has a role, use it
  const userRole = backendUser?.role?.name?.toLowerCase() || role;

  if (!userRole) {
    return <Redirect href="/(role-selection)" />;
  }

  // Redirect based on role
  if (userRole === 'user' || userRole === 'tenant' || userRole === 'normal') {
    return <Redirect href="/(normal)" />;
  } else if (userRole === 'landlord') {
    return <Redirect href="/(landlord)" />;
  } else if (userRole === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  return <Redirect href="/(role-selection)" />;
}