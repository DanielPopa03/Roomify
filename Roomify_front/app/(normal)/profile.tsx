import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white p-5">
            <View className="mt-10 mb-6 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Text className="text-blue-500 text-lg">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-2xl font-bold">Edit Profile</Text>
            </View>

            <View className="items-center mb-8">
                <View className="w-24 h-24 bg-gray-200 rounded-full mb-2" />
                <Text className="text-blue-500">Change Photo</Text>
            </View>

            <View className="mb-4">
                <Text className="text-gray-600 mb-1">Full Name</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 text-lg"
                    placeholder="John Doe"
                    defaultValue="John Doe"
                />
            </View>

            <View className="mb-4">
                <Text className="text-gray-600 mb-1">Bio</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 text-lg h-24"
                    placeholder="Tell us about yourself..."
                    multiline
                    textAlignVertical="top"
                />
            </View>

            <TouchableOpacity className="bg-black py-4 rounded-full items-center mt-4">
                <Text className="text-white font-bold text-lg">Save Changes</Text>
            </TouchableOpacity>
        </View>
    );
}
