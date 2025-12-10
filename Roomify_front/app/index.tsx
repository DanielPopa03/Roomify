import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useCurrentUser } from '../hooks/useApi';
import { Blue } from '../constants/theme';

export default function Index() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const { user: backendUser, isLoading: userLoading } = useCurrentUser();
  const { role, setRole } = useRole();

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