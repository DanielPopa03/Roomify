import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function LandlordProfileScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white p-5">
            <View className="mt-10 mb-6 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Text className="text-blue-500 text-lg">Back</Text>
                </TouchableOpacity>
                <Text className="text-2xl font-bold">Landlord Dashboard</Text>
            </View>

            <View className="items-center mb-10">
                <View className="w-24 h-24 bg-green-200 rounded-full mb-4 justify-center items-center">
                    <Text className="text-3xl font-bold text-green-800">L</Text>
                </View>
                <Text className="text-xl font-bold">Landlord Account</Text>
            </View>

            <TouchableOpacity
                className="bg-gray-100 p-6 rounded-xl mb-4 flex-row items-center justify-between"
                onPress={() => console.log('Manage Profile')}
            >
                <View>
                    <Text className="text-lg font-bold">Manage Profile</Text>
                    <Text className="text-gray-500">Update your personal details</Text>
                </View>
                <Text className="text-2xl text-gray-400">{'>'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                className="bg-gray-100 p-6 rounded-xl mb-4 flex-row items-center justify-between"
                onPress={() => console.log('Manage Rent')}
            >
                <View>
                    <Text className="text-lg font-bold">Manage Rent</Text>
                    <Text className="text-gray-500">View and edit your listings</Text>
                </View>
                <Text className="text-2xl text-gray-400">{'>'}</Text>
            </TouchableOpacity>

            <TouchableOpacity className="mt-auto bg-red-50 p-4 rounded-xl items-center">
                <Text className="text-red-500 font-bold text-lg">Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}
