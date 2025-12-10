import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native'; // <--- Added Platform import
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth0 } from 'react-native-auth0';

// Note: If testing on Android Emulator, use 'http://10.0.2.2:8080/api/properties'
const BASE_API_URL = 'http://localhost:8080/api/properties';

export default function MyPropertiesScreen() {
    const router = useRouter();
    const { getCredentials } = useAuth0();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProperties = async () => {
        try {
            const credentials = await getCredentials();
            const token = credentials?.accessToken;

            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${BASE_API_URL}/my`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const propertyList = data.content || [];
                setProperties(propertyList);
            } else {
                console.error('Failed to fetch properties');
            }
        } catch (error) {
            console.error('Network error:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProperties();
        }, [])
    );

    // --- NEW: Helper function to perform the actual API call ---
    const performDelete = async (id) => {
        try {
            const credentials = await getCredentials();
            const token = credentials?.accessToken;

            console.log(`Attempting DELETE on ${BASE_API_URL}/${id}`);

            const response = await fetch(`${BASE_API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // Remove item from list locally
                setProperties(prev => prev.filter(item => item.id !== id));
                if (Platform.OS !== 'web') {
                    Alert.alert("Success", "Property deleted");
                } else {
                    console.log("Property deleted successfully");
                }
            } else {
                const errorText = await response.text();
                console.log("Delete failed:", errorText);
                if (Platform.OS !== 'web') Alert.alert("Error", "Could not delete property.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            if (Platform.OS !== 'web') Alert.alert("Network Error", "Could not connect to server.");
        }
    };

    // --- UPDATED: handleDelete supports both Web and Mobile ---
    const handleDelete = (id) => {
        console.log("DELETING PROPERTY", id);

        // 1. Web Check
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to remove this listing?");
            if (confirmed) {
                performDelete(id);
            }
            return;
        }

        // 2. Mobile (iOS/Android) Use Native Alert
        Alert.alert(
            "Delete Property",
            "Are you sure you want to remove this listing?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => performDelete(id)
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View className="bg-white p-4 mb-4 rounded-xl border border-gray-100 shadow-sm flex-row">
            <View className="w-24 h-24 bg-gray-200 rounded-lg mr-4 items-center justify-center">
                <Text className="text-gray-400 text-xs">No Image</Text>
            </View>

            <View className="flex-1 justify-between">
                <View>
                    <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text className="text-blue-600 font-bold mt-1">
                        {item.price} RON
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                        {item.address}
                    </Text>
                </View>

                <View className="flex-row justify-end mt-2 gap-3">
                    <TouchableOpacity onPress={() => router.push({
                        pathname: '/(landlord)/create-update-property',
                        params: { id: item.id }
                    })}>
                        <Text className="text-blue-500 font-medium">Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Text className="text-red-500 font-medium">Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white p-5">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold">My Properties</Text>
                <TouchableOpacity
                    onPress={() => router.push('/(landlord)/create-update-property')}
                    className="bg-black px-4 py-2 rounded-full"
                >
                    <Text className="text-white font-bold">+ New</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20">
                            <Text className="text-gray-400 text-lg mb-2">No properties found.</Text>
                            <Text className="text-gray-400 text-center px-10">
                                Tap "+ New" to add one.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}