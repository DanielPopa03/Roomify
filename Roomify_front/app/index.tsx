import { Redirect } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth0();

  // 1. Show a spinner while Auth0 checks if we have a saved token
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}