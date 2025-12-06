import { Redirect } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';
import { useRole } from '../context/RoleContext';

export default function Index() {
  const { user, isLoading } = useAuth0();
  const { role } = useRole();

  // 1. Show a spinner while Auth0 checks if we have a saved token
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!role) {
    return <Redirect href="/(role-selection)" />;
  }

  // Redirect based on role
  if (role === 'normal') {
    return <Redirect href="/(normal)" />;
  } else if (role === 'landlord') {
    return <Redirect href="/(landlord)" />;
  } else if (role === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  return <Redirect href="/(role-selection)" />;
}