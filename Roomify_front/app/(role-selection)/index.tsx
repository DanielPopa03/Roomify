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
            
            // LOG THIS to be absolutely sure what is going into the fetch
            console.log("ACTUAL SENDING TOKEN:", credentials?.accessToken);

            if (!credentials?.accessToken) {
                console.error("No access token found");
                return;
            }

            // Using localhost as requested (Use 10.0.2.2 for Android Emulator)
            const response = await fetch('http://localhost:8080/user/authorize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const user = await response.json();
                const roleName = user.role.name.toLowerCase(); // Assuming Role has a 'name' field
                
                console.log("User authorized:", user);

                // Update Context
                setRole(roleName); 

                // Route based on the role received from Backend
                if (roleName === 'user' || roleName === 'normal') {
                    router.replace('/(normal)');
                } else if (roleName === 'landlord') {
                    router.replace('/(landlord)');
                } else if (roleName === 'admin') {
                    router.replace('/(admin)');
                } else {
                    // Fallback default
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