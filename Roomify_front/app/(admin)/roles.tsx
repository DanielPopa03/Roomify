import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

// Mock data for users and roles
const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Tenant' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Landlord' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'Tenant' },
];

export default function RolesScreen() {
    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 mb-2 rounded-lg shadow-sm flex-row justify-between items-center">
            <View>
                <Text className="font-bold text-lg">{item.name}</Text>
                <Text className="text-gray-500">{item.email}</Text>
            </View>
            <TouchableOpacity className="bg-gray-200 py-2 px-4 rounded-md">
                <Text className="font-bold">{item.role}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-100 p-4">
            <View className="mt-10 mb-6">
                <Text className="text-2xl font-bold">Manage Roles</Text>
            </View>

            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={item => item.id}
            />
        </View>
    );
}
