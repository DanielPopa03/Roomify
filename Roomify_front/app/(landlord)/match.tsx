import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

// Mock data for matches
const matches = [
    { id: '1', name: 'Sarah Jenkins', message: 'I love the place!', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', rentId: 'rent1' },
    { id: '2', name: 'Tom Hardy', message: 'When can I move in?', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', rentId: 'rent2' },
    { id: '3', name: 'Emily Blunt', message: 'Is the price negotiable?', avatar: 'https://randomuser.me/api/portraits/women/12.jpg', rentId: 'rent1' },
];

export default function LandlordMatchScreen() {
    const router = useRouter();
    const [filterRentId, setFilterRentId] = useState<string | null>(null);

    const filteredMatches = filterRentId
        ? matches.filter(m => m.rentId === filterRentId)
        : matches;

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100 bg-white"
            onPress={() => console.log('Open chat', item.id)}
        >
            <Image source={{ uri: item.avatar }} className="w-14 h-14 rounded-full mr-4" />
            <View className="flex-1">
                <Text className="text-lg font-bold">{item.name}</Text>
                <Text className="text-gray-500" numberOfLines={1}>{item.message}</Text>
                <Text className="text-xs text-gray-400 mt-1">Rent ID: {item.rentId}</Text>
            </View>
            <View className="w-3 h-3 bg-green-500 rounded-full" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 mt-10 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-blue-500 text-lg">Back</Text>
                </TouchableOpacity>

                <Text className="text-xl font-bold">Matches</Text>

                <TouchableOpacity onPress={() => {
                    // Toggle filter for demo purposes
                    setFilterRentId(prev => prev === 'rent1' ? null : 'rent1');
                }}>
                    <Text className="text-blue-500 text-lg">{filterRentId ? 'Show All' : 'Filter Rent'}</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredMatches}
                renderItem={renderItem}
                keyExtractor={item => item.id}
            />
        </View>
    );
}
