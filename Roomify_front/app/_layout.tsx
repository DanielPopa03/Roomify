import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '../context/AuthContext';
import '../global.css';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

function MainLayout() {
  // Add isBanned to your destructuring
  const { isAuthenticated, isLoading, isProfileComplete, isBanned } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';
    const inSetupScreen = segments[0] === 'complete-profile';
    const inBannedScreen = (segments[0] as string) === 'banned'; // Check if on banned screen

    // 0. CHECK BAN STATUS FIRST
    if (isAuthenticated && isBanned) {
      if (!inBannedScreen) {
        router.replace('/banned');
      }
      return; // Stop further checks
    }

    // If NOT banned, but trying to access banned screen, redirect home
    if (isAuthenticated && !isBanned && inBannedScreen) {
      router.replace('/');
      return;
    }

    // 1. Not Logged In
    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
      return;
    }

    // 2. Logged In BUT Profile Incomplete
    if (isAuthenticated && !isProfileComplete) {
      if (!inSetupScreen) {
        router.replace('/complete-profile');
      }
      return;
    }

    // 3. Logged In AND Profile Complete
    if (isAuthenticated && isProfileComplete) {
      if (inAuthGroup || inSetupScreen) {
        router.replace('/');
      }
    }

  }, [isAuthenticated, isProfileComplete, isBanned, segments, isLoading]);

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
                options={{ gestureEnabled: false }}
            />
            {/* ADD BANNED SCREEN HERE */}
            <Stack.Screen
                name="banned"
                options={{ gestureEnabled: false }}
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
import { StripeProviderWrapper } from '../components/StripeProviderWrapper';
export default function RootLayout() {
  return (
    <StripeProviderWrapper>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </StripeProviderWrapper>
  );
}