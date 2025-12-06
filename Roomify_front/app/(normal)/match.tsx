import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

// Mock data for matches
const matches = [
    { id: '1', name: 'John Doe', message: 'Hey, is the room still available?', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: '2', name: 'Jane Smith', message: 'I would like to schedule a visit.', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { id: '3', name: 'Mike Johnson', message: 'What is the deposit amount?', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
];

export default function MatchScreen() {
    const router = useRouter();

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100 bg-white"
            onPress={() => console.log('Open chat', item.id)}
        >
            <Image source={{ uri: item.avatar }} className="w-14 h-14 rounded-full mr-4" />
            <View className="flex-1">
                <Text className="text-lg font-bold">{item.name}</Text>
                <Text className="text-gray-500" numberOfLines={1}>{item.message}</Text>
            </View>
            <View className="w-3 h-3 bg-blue-500 rounded-full" />
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

                <TouchableOpacity onPress={() => console.log('Options pressed')}>
                    <Text className="text-blue-500 text-lg">Options</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={matches}
                renderItem={renderItem}
                keyExtractor={item => item.id}
            />
        </View>
    );
}
