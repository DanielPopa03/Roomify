import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
      <SafeAreaView className="flex-1 bg-white p-6 justify-center">

        <View className="items-center mb-12">
          <Text className="text-4xl font-extrabold text-blue-600 mb-2">Roomify</Text>
          <Text className="text-gray-500 text-lg">Choose your mode</Text>
        </View>

        {/* LANDLORD BUTTON */}
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(landlord)')}
            className="bg-white p-6 rounded-3xl border-2 border-gray-100 mb-6 shadow-sm flex-row items-center"
        >
          <View className="w-16 h-16 bg-blue-100 rounded-full justify-center items-center mr-4">
            <Text className="text-3xl">🏠</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-800">Landlord Mode</Text>
            <Text className="text-gray-500 mt-1">List properties & find tenants</Text>
          </View>
          <Text className="text-gray-300 text-2xl font-bold">{'>'}</Text>
        </TouchableOpacity>

        {/* TENANT BUTTON */}
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tenant)')}
            // Note: Ensure you have a app/(tenant) folder, or this will error!
            className="bg-white p-6 rounded-3xl border-2 border-gray-100 mb-6 shadow-sm flex-row items-center"
        >
          <View className="w-16 h-16 bg-green-100 rounded-full justify-center items-center mr-4">
            <Text className="text-3xl">🔍</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-800">Tenant Mode</Text>
            <Text className="text-gray-500 mt-1">Swipe & find your new home</Text>
          </View>
          <Text className="text-gray-300 text-2xl font-bold">{'>'}</Text>
        </TouchableOpacity>

        {/* ADMIN BUTTON (Optional) */}
        <TouchableOpacity
            onPress={() => console.log("Admin pressed")}
            className="mt-4 p-4 items-center"
        >
          <Text className="text-gray-400 font-medium">Log in as Admin</Text>
        </TouchableOpacity>

      </SafeAreaView>
  );
}