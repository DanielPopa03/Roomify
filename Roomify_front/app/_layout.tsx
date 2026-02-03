import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router'; // <--- Add these imports
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '../context/AuthContext';
import '../global.css';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

// 1. Create a Component that has access to AuthContext
function MainLayout() {
  const { isAuthenticated, isLoading, isProfileComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;

    // Check where the user is currently trying to go
    const inAuthGroup = segments[0] === 'login'; // or '(auth)' if you have a group
    const inSetupScreen = segments[0] === 'complete-profile';

    // 1. Not Logged In
    if (!isAuthenticated) {
      if (!inAuthGroup) {
        // If they are trying to go anywhere except login, force login
        router.replace('/login');
      }
      return;
    }

    // 2. Logged In BUT Profile Incomplete
    if (isAuthenticated && !isProfileComplete) {
      if (!inSetupScreen) {
        // If they are anywhere except the setup screen (e.g. /profile, /index), force setup
        router.replace('/complete-profile');
      }
      return;
    }

    // 3. Logged In AND Profile Complete
    if (isAuthenticated && isProfileComplete) {
      // If they are stuck on login or setup page, move them to the app
      if (inAuthGroup || inSetupScreen) {
        router.replace('/');
      }
    }

  }, [isAuthenticated, isProfileComplete, segments, isLoading]);

  // Show a blank screen or loading spinner while Auth0 initializes
  // This prevents the "Login" screen from flashing before redirecting
  if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
    );
  }

  return (
      <PaperProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen
                name="complete-profile"
                options={{ gestureEnabled: false }} // Prevent swiping back
            />
            <Stack.Screen name="(normal)" />
            <Stack.Screen name="(landlord)" />
            <Stack.Screen name="(admin)" />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
  );
}

// 2. The Root Layout just wraps the MainLayout with the Provider
import { StripeProviderWrapper } from '@/components/StripeProviderWrapper';

export default function RootLayout() {
  return (
    <StripeProviderWrapper>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </StripeProviderWrapper>
  );
}