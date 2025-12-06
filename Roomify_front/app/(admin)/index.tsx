import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Mock data for reports
const reports = [
    { id: '1', user: 'John Doe', reason: 'Inappropriate behavior', status: 'Pending' },
    { id: '2', user: 'Jane Smith', reason: 'Fake listing', status: 'Resolved' },
    { id: '3', user: 'Mike Johnson', reason: 'Spam', status: 'Pending' },
];

export default function ReportsScreen() {
    const router = useRouter();

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 mb-2 rounded-lg shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-lg">{item.user}</Text>
                <Text className={`text-sm ${item.status === 'Pending' ? 'text-orange-500' : 'text-green-500'}`}>{item.status}</Text>
            </View>
            <Text className="text-gray-600 mb-2">Reason: {item.reason}</Text>
            <View className="flex-row justify-end">
                <TouchableOpacity className="bg-blue-500 py-2 px-4 rounded-md mr-2">
                    <Text className="text-white">View</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-red-500 py-2 px-4 rounded-md">
                    <Text className="text-white">Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-100 p-4">
            <View className="mt-10 mb-6 flex-row justify-between items-center">
                <Text className="text-2xl font-bold">Manage Reports</Text>
                <TouchableOpacity onPress={() => router.replace('/(role-selection)')}>
                    <Text className="text-blue-500">Switch Role</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={reports}
                renderItem={renderItem}
                keyExtractor={item => item.id}
            />
        </View>
    );
}
