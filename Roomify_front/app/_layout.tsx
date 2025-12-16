import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { Platform } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import '../global.css';
import { useColorScheme } from '../hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
        <PaperProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(normal)" />
              <Stack.Screen name="(landlord)" />
              <Stack.Screen name="(admin)" />
            </Stack>
          </ThemeProvider>
        </PaperProvider>
    </AuthProvider>
  );
}