import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { Blue, Neutral } from '../../constants/theme';

export default function RoleSelectionScreen() {
    const router = useRouter();
    const { getAccessToken, isAuthenticated, user } = useAuth();
    const { setRole } = useRole();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            checkUserRole();
        }
    }, [isAuthenticated]);

    const checkUserRole = async () => {
        try {
            const accessToken = await getAccessToken();
            
            if (!accessToken) {
                console.error("No access token found");
                setError("Unable to get access token");
                setLoading(false);
                return;
            }

            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/user/authorize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                const roleName = userData.role?.name?.toLowerCase() || 'user';
                
                console.log("User authorized:", userData);

                setRole(roleName as any); 

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
                const errorText = await response.text();
                console.error("Server error:", errorText);
                setError("Failed to authorize user");
            }

        } catch (err) {
            console.error("Network request failed:", err);
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // DEV MODE: Quick role selection for testing
    const handleQuickRoleSelect = (selectedRole: 'normal' | 'landlord' | 'admin') => {
        setRole(selectedRole);
        if (selectedRole === 'normal') {
            router.replace('/(normal)');
        } else if (selectedRole === 'landlord') {
            router.replace('/(landlord)');
        } else if (selectedRole === 'admin') {
            router.replace('/(admin)');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color={Blue[600]} />
                <Text className="mt-4" style={{ color: Neutral[500] }}>Verifying profile...</Text>
            </View>
        );
    }

    // Show role selection for testing (or when API fails)
    return (
        <View className="flex-1 justify-center items-center bg-white p-6">
            <Text className="text-2xl font-bold mb-2" style={{ color: Neutral[900] }}>
                Welcome{user?.name ? `, ${user.name}` : ''}!
            </Text>
            
            {error && (
                <View className="bg-yellow-50 p-4 rounded-lg mb-6 w-full max-w-sm">
                    <Text className="text-yellow-700 text-center text-sm">{error}</Text>
                    <Text className="text-yellow-600 text-center text-xs mt-1">
                        Select a role to continue testing:
                    </Text>
                </View>
            )}

            <Text className="text-gray-500 mb-8 text-center">
                Select your role to continue
            </Text>

            <View className="w-full max-w-sm gap-4">
                <TouchableOpacity
                    onPress={() => handleQuickRoleSelect('normal')}
                    className="p-4 rounded-xl border-2"
                    style={{ borderColor: Blue[200], backgroundColor: Blue[50] }}
                >
                    <Text className="text-lg font-semibold" style={{ color: Blue[700] }}>
                        🏠 I'm looking for a room
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: Neutral[600] }}>
                        Browse properties and connect with landlords
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleQuickRoleSelect('landlord')}
                    className="p-4 rounded-xl border-2"
                    style={{ borderColor: Blue[200], backgroundColor: 'white' }}
                >
                    <Text className="text-lg font-semibold" style={{ color: Neutral[800] }}>
                        🔑 I'm a landlord
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: Neutral[600] }}>
                        List properties and find tenants
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleQuickRoleSelect('admin')}
                    className="p-4 rounded-xl border-2"
                    style={{ borderColor: Neutral[200], backgroundColor: Neutral[50] }}
                >
                    <Text className="text-lg font-semibold" style={{ color: Neutral[700] }}>
                        ⚙️ Admin
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: Neutral[500] }}>
                        Manage users and reports
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}