import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

export default function LoginScreen() {
  const { authorize, error } = useAuth0();
  const router = useRouter();

  const onLogin = async () => {
    try {
      await authorize({ scope: 'openid profile email' });
      // On success, go to root to trigger role check in index.tsx
      router.replace('/');
    } catch (e) {
      console.log('Login cancelled or failed', e);
    }
  };

  return (
    // style={{ flex: 1 }} ensures the screen is visible even if Tailwind breaks
    <View className="flex-1 justify-center items-center bg-gray-100 p-5" style={{ flex: 1 }}>
      <Text className="text-3xl font-bold text-blue-600 mb-8">Roomify</Text>

      {error && <Text className="text-red-500 mb-4">{error.message}</Text>}

      <TouchableOpacity
        onPress={onLogin}
        className="bg-black py-4 px-10 rounded-full shadow-lg active:opacity-80"
      >
        <Text className="text-white font-bold text-lg">Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}