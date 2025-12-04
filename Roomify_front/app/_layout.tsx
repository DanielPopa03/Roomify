import { DarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Auth0Provider } from 'react-native-auth0';
import { MD3LightTheme as DefaultTheme, PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Auth0Provider domain="dev-vje7ys1p3yin1euy.eu.auth0.com" clientId="n6383IGJTkHokyNzg11T2r9o7evIU72w">
      <PaperProvider theme={DefaultTheme}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : NavigationDefaultTheme}>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </Auth0Provider>
  );
}