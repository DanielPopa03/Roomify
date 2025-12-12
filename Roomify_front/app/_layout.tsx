import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';
import { PaperProvider } from 'react-native-paper';
import { RoleProvider } from '../context/RoleContext';
import '../global.css';
import { useColorScheme } from '../hooks/use-color-scheme';

// 1. Create a component to handle the Navigation Logic & Protection
function AppLayout() {
  const { user, isLoading } = useAuth0();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // Wait for Auth0 to initialize

    const inLoginGroup = segments[0] === 'login';

    if (!user && !inLoginGroup) {
      // If not logged in and trying to access the app, send to login
      router.replace('/login');
    } else if (user && inLoginGroup) {
      // If logged in and stuck on login screen, send to home
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  // 2. Show a loading spinner while Auth0 checks the token
  if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
    );
  }

  // 3. Define your stack
  return (
      <Stack>
        {/* Index is your RoleSelection/Home */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(role-selection)" options={{ headerShown: false }} />
        <Stack.Screen name="(tenant)" options={{ headerShown: false }} />
        <Stack.Screen name="(landlord)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
  );
}

// 4. The Export remains the Provider Wrapper
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '';
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';

  return (
      <Auth0Provider
          domain={domain}
          clientId={clientId}
          // @ts-ignore: Force this through in case the web client uses it as a default
          audience="https://roomify-api"
      >
        <RoleProvider>
          <PaperProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              {/* Call the internal component here */}
              <AppLayout />
            </ThemeProvider>
          </PaperProvider>
        </RoleProvider>
      </Auth0Provider>
  );
}