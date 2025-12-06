import React from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LandlordSwipeScreen() {
    const router = useRouter();

    // Mock data for potential tenants
    const tenant = {
        image: 'https://randomuser.me/api/portraits/women/44.jpg',
        name: 'Sarah Jenkins',
        age: '24',
        occupation: 'Graphic Designer',
        bio: 'Looking for a quiet place near the city center. I have a cat.',
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header with Profile Button and Filter Button */}
            <View className="flex-row justify-between items-center p-4 mt-10">
                <TouchableOpacity onPress={() => router.push('/(landlord)/profile')}>
                    <View className="w-10 h-10 bg-green-200 rounded-full justify-center items-center">
                        <Text>L</Text>
                    </View>
                </TouchableOpacity>

                <Text className="text-xl font-bold">Roomify (Landlord)</Text>

                <TouchableOpacity onPress={() => console.log('Filter pressed')}>
                    <View className="w-10 h-10 bg-gray-100 rounded-full justify-center items-center">
                        <Text>F</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Swipe Card */}
            <View className="flex-1 items-center justify-center p-4">
                <View className="w-full h-3/4 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
                    <Image
                        source={{ uri: tenant.image }}
                        className="w-full h-2/3"
                        resizeMode="cover"
                    />
                    <View className="p-5">
                        <Text className="text-2xl font-bold mb-2">{tenant.name}, {tenant.age}</Text>
                        <Text className="text-lg text-gray-600 mb-2">{tenant.occupation}</Text>
                        <Text className="text-sm text-gray-500" numberOfLines={3}>{tenant.bio}</Text>
                    </View>
                </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-evenly mb-10">
                <TouchableOpacity className="w-16 h-16 bg-red-100 rounded-full justify-center items-center shadow-sm">
                    <Text className="text-red-500 text-2xl">X</Text>
                </TouchableOpacity>
                <TouchableOpacity className="w-16 h-16 bg-green-100 rounded-full justify-center items-center shadow-sm">
                    <Text className="text-green-500 text-2xl">✓</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
