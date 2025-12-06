import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useRole } from '../../context/RoleContext';

export default function RoleSelectionScreen() {
    const router = useRouter();
    const { setRole } = useRole();

    const handleRoleSelect = (role: 'normal' | 'landlord' | 'admin') => {
        setRole(role);
        // Navigate to the appropriate section based on role
        // For now, we'll redirect to the main tabs, but we'll need to set up specific routes for each role later
        // or use a single (tabs) route that adapts based on role.
        // Based on the plan, we should have specific routes.
        // Let's assume we will create (normal), (landlord), (admin) groups.
        // For now, let's just log it and go to (tabs) as a placeholder if routes don't exist yet, 
        // but the plan said we will create them.

        if (role === 'normal') {
            router.replace('/(normal)');
        } else if (role === 'landlord') {
            router.replace('/(landlord)');
        } else if (role === 'admin') {
            router.replace('/(admin)');
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-white p-5" style={{ flex: 1 }}>
            <Text className="text-2xl font-bold mb-8">Select Your Role</Text>

            <TouchableOpacity
                onPress={() => handleRoleSelect('normal')}
                className="bg-blue-500 py-4 px-10 rounded-full mb-4 w-full items-center"
            >
                <Text className="text-white font-bold text-lg">Tenant (Normal User)</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleRoleSelect('landlord')}
                className="bg-green-500 py-4 px-10 rounded-full mb-4 w-full items-center"
            >
                <Text className="text-white font-bold text-lg">Landlord</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleRoleSelect('admin')}
                className="bg-red-500 py-4 px-10 rounded-full w-full items-center"
            >
                <Text className="text-white font-bold text-lg">Admin</Text>
            </TouchableOpacity>
        </View>
    );
}
