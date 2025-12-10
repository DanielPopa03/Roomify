import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { Auth0Provider } from 'react-native-auth0';
import { PaperProvider } from 'react-native-paper';
import { RoleProvider } from '../context/RoleContext';
import '../global.css';
import { useColorScheme } from '../hooks/use-color-scheme';

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
            <Stack>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(role-selection)" options={{ headerShown: false }} />
              <Stack.Screen name="(tenant)" options={{ headerShown: false }} />
              <Stack.Screen name="(landlord)" options={{ headerShown: false }} />
              <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </PaperProvider>
      </RoleProvider>
    </Auth0Provider>
  );
}