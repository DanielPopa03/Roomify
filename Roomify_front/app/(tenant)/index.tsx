import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Appbar, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SwipeScreen() {
    const router = useRouter();

    // Mock data for property
    const property = {
        image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        price: '$1,200/mo',
        address: '123 Main St, New York, NY',
        description: 'Beautiful 2-bedroom apartment in the heart of the city. Close to subway and parks.',
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header with Profile Button and Filter Button */}
            <View className="flex-row justify-between items-center p-4 mt-10">
                <TouchableOpacity onPress={() => router.push('/(normal)/profile')}>
                    <View className="w-10 h-10 bg-gray-300 rounded-full justify-center items-center">
                        <Text>P</Text>
                    </View>
                </TouchableOpacity>

                <Text className="text-xl font-bold">Roomify</Text>

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
                        source={{ uri: property.image }}
                        className="w-full h-2/3"
                        resizeMode="cover"
                    />
                    <View className="p-5">
                        <Text className="text-2xl font-bold mb-2">{property.price}</Text>
                        <Text className="text-lg text-gray-600 mb-2">{property.address}</Text>
                        <Text className="text-sm text-gray-500" numberOfLines={3}>{property.description}</Text>
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
