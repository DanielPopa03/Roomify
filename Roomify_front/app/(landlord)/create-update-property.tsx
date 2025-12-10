import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth0 } from 'react-native-auth0';

const API_URL = 'http://localhost:8080/api/properties';

const LAYOUT_OPTIONS = ['DECOMANDAT', 'SEMIDECOMANDAT', 'NEDECOMANDAT', 'CIRCULAR'];

export default function CreatePropertyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { getCredentials } = useAuth0();

    const propertyId = params.id;
    const isEditing = !!propertyId;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [surface, setSurface] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [numberOfRooms, setNumberOfRooms] = useState('');
    const [hasExtraBathroom, setHasExtraBathroom] = useState(false);
    const [layoutType, setLayoutType] = useState('DECOMANDAT');
    const [smokerFriendly, setSmokerFriendly] = useState(false);
    const [petFriendly, setPetFriendly] = useState(false);

    const resetForm = () => {
        setTitle('');
        setPrice('');
        setSurface('');
        setAddress('');
        setDescription('');
        setNumberOfRooms('');
        setHasExtraBathroom(false);
        setLayoutType('DECOMANDAT');
        setSmokerFriendly(false);
        setPetFriendly(false);
    };

    useEffect(() => {
        if (isEditing) {
            fetchPropertyDetails();
        } else {
            resetForm();
        }
    }, [propertyId]);

    const fetchPropertyDetails = async () => {
        setInitialLoading(true);
        try {
            const credentials = await getCredentials();
            const token = credentials?.accessToken;

            const response = await fetch(`${API_URL}/${propertyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTitle(data.title);
                setPrice(data.price?.toString() || '');
                setSurface(data.surface?.toString() || '');
                setAddress(data.address);
                setDescription(data.description || '');
                setNumberOfRooms(data.numberOfRooms?.toString() || '');
                setHasExtraBathroom(data.hasExtraBathroom || false);
                setLayoutType(data.layoutType || 'DECOMANDAT');
                setSmokerFriendly(data.smokerFriendly || false);
                setPetFriendly(data.petFriendly || false);
            } else {
                Alert.alert("Error", "Could not load property details.");
                router.back();
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network error.");
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!title || !price || !address) {
            Alert.alert("Missing Fields", "Please fill in all required fields.");
            return;
        }

        setLoading(true);
        try {
            const credentials = await getCredentials();
            const token = credentials?.accessToken;

            const payload = {
                title,
                price: parseFloat(price),
                surface: parseFloat(surface),
                address,
                description,
                numberOfRooms: parseInt(numberOfRooms),
                hasExtraBathroom,
                layoutType,
                smokerFriendly,
                petFriendly,
                preferredTenants: []
            };

            const url = isEditing ? `${API_URL}/${propertyId}` : API_URL;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                // --- INSTANT REDIRECT (No Alert) ---
                resetForm();
                router.replace('/(landlord)/my-properties');
            } else {
                const errText = await response.text();
                console.error("Backend Error:", errText);
                Alert.alert("Error", "Operation failed. Check inputs.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network error occurred.");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#0000ff" />
                <Text className="mt-4 text-gray-500">Loading details...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{
                title: isEditing ? "Edit Property" : "Create Property",
                headerShown: false
            }} />

            {/* Header */}
            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.replace('/(landlord)/my-properties')}>
                    <Text className="text-blue-600 text-lg">Cancel</Text>
                </TouchableOpacity>

                <Text className="text-xl font-bold">
                    {isEditing ? "Edit Property" : "New Property"}
                </Text>

                <View className="w-10" />
            </View>

            <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 50 }}>
                {/* Title */}
                <Text className="mb-2 font-semibold text-gray-700">Property Title</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 mb-4"
                    placeholder="e.g. Modern Apartment"
                    value={title}
                    onChangeText={setTitle}
                />

                {/* Price */}
                <Text className="mb-2 font-semibold text-gray-700">Price (RON)</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 mb-4"
                    placeholder="e.g. 450"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                />

                {/* Address */}
                <Text className="mb-2 font-semibold text-gray-700">Address</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 mb-4"
                    placeholder="Full street address"
                    value={address}
                    onChangeText={setAddress}
                />

                {/* Description */}
                <Text className="mb-2 font-semibold text-gray-700">Description</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 mb-4 h-24"
                    placeholder="Describe the property..."
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                />

                {/* Layout Type */}
                <Text className="mb-2 font-semibold text-gray-700">Layout Type</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                    {LAYOUT_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option}
                            onPress={() => setLayoutType(option)}
                            className={`px-3 py-2 rounded-lg border ${
                                layoutType === option
                                    ? 'bg-black border-black'
                                    : 'bg-white border-gray-300'
                            }`}
                        >
                            <Text className={layoutType === option ? 'text-white' : 'text-gray-700'}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Surface */}
                <Text className="mb-2 font-semibold text-gray-700">Surface (sqm)</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 mb-4"
                    placeholder="e.g. 55"
                    keyboardType="numeric"
                    value={surface}
                    onChangeText={setSurface}
                />

                {/* Rooms */}
                <Text className="mb-2 font-semibold text-gray-700">Number of Rooms</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 mb-4"
                    placeholder="e.g. 2"
                    keyboardType="numeric"
                    value={numberOfRooms}
                    onChangeText={setNumberOfRooms}
                />

                {/* Switches */}
                <View className="flex-row justify-between items-center mb-4 mt-2">
                    <Text className="text-gray-700 font-medium">Extra Bathroom?</Text>
                    <Switch value={hasExtraBathroom} onValueChange={setHasExtraBathroom} />
                </View>

                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-gray-700 font-medium">Pet Friendly?</Text>
                    <Switch value={petFriendly} onValueChange={setPetFriendly} />
                </View>

                <View className="flex-row justify-between items-center mb-8">
                    <Text className="text-gray-700 font-medium">Smoker Friendly?</Text>
                    <Switch value={smokerFriendly} onValueChange={setSmokerFriendly} />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className={`p-4 rounded-full items-center mb-10 ${loading ? 'bg-gray-400' : 'bg-black'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            {isEditing ? "Update Property" : "Create Listing"}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}