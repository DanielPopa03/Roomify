import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

export default function LoginScreen() {
  const { authorize, error } = useAuth0();
  const router = useRouter();

  const onLogin = async () => {
    try {
        await authorize({ 
            scope: 'openid profile email offline_access',
            audience: 'https://roomify-api', // 1. Standard place
            // @ts-ignore: Allow custom params for Web
            additionalParameters: {
                prompt: 'login',
                audience: 'https://roomify-api' // 2. Force into query params
            },
            // @ts-ignore: Some versions check connectionParams
            connectionParams: {
                audience: 'https://roomify-api' // 3. Fallback
            }
        });
        router.replace('/');
    } catch (e) {
        console.log(e);
    }
  };

  return (
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