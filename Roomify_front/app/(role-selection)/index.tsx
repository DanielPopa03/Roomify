import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { useRole } from '../../context/RoleContext';

export default function RoleSelectionScreen() {
    const router = useRouter();
    const { getCredentials } = useAuth0();
    const { setRole } = useRole();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        try {
            const credentials = await getCredentials();
            
            if (!credentials?.accessToken) {
                console.error("No access token found");
                return;
            }
            const response = await fetch('http://localhost:8080/user/authorize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const user = await response.json();
                const roleName = user.role.name.toLowerCase();
                
                console.log("User authorized:", user);

                setRole(roleName); 

                if (roleName === 'user' || roleName === 'normal') {
                    router.replace('/(normal)');
                } else if (roleName === 'landlord') {
                    router.replace('/(landlord)');
                } else if (roleName === 'admin') {
                    router.replace('/(admin)');
                } else {
                    router.replace('/(normal)');
                }
            } else {
                console.error("Server error:", await response.text());
            }

        } catch (error) {
            console.error("Network request failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#0000ff" />
                <Text className="mt-4 text-gray-500">Verifying profile...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 justify-center items-center bg-white p-5">
            <Text className="text-xl text-red-500">
                If you see this, redirect failed.
            </Text>
        </View>
    );
}