import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth0 } from 'react-native-auth0';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const API_URL = 'http://localhost:8080/api/properties';
// 1. Added NESPECIFICAT
const LAYOUT_OPTIONS = ['DECOMANDAT', 'SEMIDECOMANDAT', 'NEDECOMANDAT', 'CIRCULAR', 'NESPECIFICAT'];
const MAX_PHOTOS = 7;

export default function CreatePropertyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { getCredentials } = useAuth0();

    const propertyId = params.id;
    const isEditing = !!propertyId;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [errors, setErrors] = useState<{[key: string]: string}>({});

    const [images, setImages] = useState<any[]>([]);
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);

    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [surface, setSurface] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [numberOfRooms, setNumberOfRooms] = useState('');
    const [hasExtraBathroom, setHasExtraBathroom] = useState(false);

    // 2. Default to null (NESPECIFICAT)
    const [layoutType, setLayoutType] = useState<string | null>(null);

    const [smokerFriendly, setSmokerFriendly] = useState<boolean | null>(null);
    const [petFriendly, setPetFriendly] = useState<boolean | null>(null);

    const resetForm = () => {
        setTitle(''); setPrice(''); setSurface(''); setAddress('');
        setDescription(''); setNumberOfRooms(''); setHasExtraBathroom(false);
        setLayoutType(null); // Reset to NESPECIFICAT
        setSmokerFriendly(null); setPetFriendly(null);
        setImages([]); setDeletedImageIds([]); setErrors({});
    };

    useFocusEffect(
        useCallback(() => {
            if (isEditing) fetchPropertyDetails();
            else resetForm();
        }, [propertyId])
    );

    // ... (Helpers: getOrderedIdentifiers, moveImage, pickImage, removeImage remain the same) ...
    const getOrderedIdentifiers = () => {
        let localIndex = 0;
        return images.map(img => img.type === 'server' ? `ID_${img.id}` : `NEW_${localIndex++}`);
    };

    const moveImage = (fromIndex: number, direction: 'left' | 'right') => {
        const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= images.length) return;
        const newImages = [...images];
        [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
        setImages(newImages);
    };

    const pickImage = async () => {
        if (images.length >= MAX_PHOTOS) {
            Alert.alert("Limit Reached", `You can only upload a maximum of ${MAX_PHOTOS} photos.`);
            return;
        }
        const remainingSlots = MAX_PHOTOS - images.length;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remainingSlots,
            quality: 1,
        });

        if (!result.canceled) {
            if (result.assets.length > remainingSlots) {
                Alert.alert("Too many photos", `Limit exceeded.`);
                return;
            }
            setLoading(true);
            try {
                const processedImages = await Promise.all(
                    result.assets.map(async (asset) => {
                        const targetWidth = 1080;
                        const actions = asset.width > targetWidth ? [{ resize: { width: targetWidth } }] : [];
                        const manipResult = await ImageManipulator.manipulateAsync(
                            asset.uri, actions, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        return { uri: manipResult.uri, type: 'local' };
                    })
                );
                if (errors.photos) setErrors(prev => ({...prev, photos: ''}));
                setImages([...images, ...processedImages]);
            } catch (error) { console.error(error); }
            finally { setLoading(false); }
        }
    };

    const removeImage = (index: number) => {
        const imageToRemove = images[index];
        if (imageToRemove.type === 'server') {
            setDeletedImageIds([...deletedImageIds, imageToRemove.id]);
        }
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

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

                // Use DB value or fallback to null (NESPECIFICAT)
                setLayoutType(data.layoutType || null);
                setSmokerFriendly(data.smokerFriendly);
                setPetFriendly(data.petFriendly);

                if (data.images && Array.isArray(data.images)) {
                    const serverImages = data.images.map((img: any) => ({
                        id: img.id, uri: img.url, type: 'server'
                    }));
                    setImages(serverImages);
                }
            }
        } catch (error) { console.error(error); }
        finally { setInitialLoading(false); }
    };

    const validateForm = () => {
        let newErrors: {[key: string]: string} = {};
        let isValid = true;

        if (!title.trim()) { newErrors.title = "Title is required"; isValid = false; }
        if (!price.trim()) { newErrors.price = "Price is required"; isValid = false; }
        else if (isNaN(parseFloat(price))) { newErrors.price = "Must be a number"; isValid = false; }

        if (!surface.trim()) { newErrors.surface = "Surface is required"; isValid = false; }
        else if (isNaN(parseFloat(surface))) { newErrors.surface = "Must be a number"; isValid = false; }

        if (!address.trim()) { newErrors.address = "Address is required"; isValid = false; }

        if (!numberOfRooms.trim()) { newErrors.numberOfRooms = "Number of rooms is required"; isValid = false; }
        else if (isNaN(parseInt(numberOfRooms))) { newErrors.numberOfRooms = "Must be a whole number"; isValid = false; }

        if (images.length === 0) {
            newErrors.photos = "At least one photo is required";
            isValid = false;
            Alert.alert("Missing Photos", "Please upload at least one photo.");
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const credentials = await getCredentials();
            const token = credentials?.accessToken;

            const propertyData = {
                title,
                price: parseFloat(price),
                surface: parseFloat(surface),
                address,
                description,
                numberOfRooms: parseInt(numberOfRooms),
                hasExtraBathroom,
                layoutType, // null is sent as null
                smokerFriendly,
                petFriendly,
                preferredTenants: [],
                deletedImageIds: deletedImageIds,
                orderedIdentifiers: getOrderedIdentifiers()
            };

            const formData = new FormData();
            formData.append('data', JSON.stringify(propertyData));

            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (img.type === 'local') {
                    const filename = img.uri.split('/').pop() || `photo_${i}.jpg`;
                    if (Platform.OS === 'web') {
                        const res = await fetch(img.uri);
                        const blob = await res.blob();
                        formData.append('images', blob, filename);
                    } else {
                        // @ts-ignore
                        formData.append('images', { uri: img.uri, name: filename, type: 'image/jpeg' });
                    }
                }
            }

            const url = isEditing ? `${API_URL}/${propertyId}` : API_URL;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (response.ok) {
                router.replace('/(landlord)/my-properties');
            } else {
                const errText = await response.text();
                Alert.alert("Error", "Operation failed. " + errText);
            }
        } catch (error) {
            Alert.alert("Error", "Network error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const RenderError = ({ field }: { field: string }) => (
        errors[field] ? <Text className="text-red-500 text-xs mt-1 ml-1">{errors[field]}</Text> : null
    );

    const TriStateSelector = ({ label, value, onChange }: any) => (
        <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">{label}</Text>
            <View className="flex-row bg-gray-100 rounded-xl p-1">
                <TouchableOpacity onPress={() => onChange(true)} className={`flex-1 py-3 rounded-lg items-center ${value === true ? 'bg-black shadow-sm' : ''}`}>
                    <Text className={value === true ? 'text-white font-bold' : 'text-gray-500'}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onChange(false)} className={`flex-1 py-3 rounded-lg items-center ${value === false ? 'bg-black shadow-sm' : ''}`}>
                    <Text className={value === false ? 'text-white font-bold' : 'text-gray-500'}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onChange(null)} className={`flex-1 py-3 rounded-lg items-center ${value === null ? 'bg-black shadow-sm' : ''}`}>
                    <Text className={value === null ? 'text-white font-bold' : 'text-gray-500'}>Don't Care</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
        const index = images.indexOf(item);
        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    className={`mr-3 relative ${isActive ? 'opacity-50' : 'opacity-100'}`}
                    style={{ width: 110, height: 110 }}
                >
                    <Image
                        source={{ uri: item.uri }}
                        className={`w-full h-full rounded-xl ${index === 0 ? 'border-4 border-blue-500' : ''}`}
                        resizeMode="cover"
                    />
                    {index === 0 && (
                        <View className="absolute bottom-0 w-full bg-blue-500 py-1 items-center rounded-b-lg">
                            <Text className="text-white text-[10px] font-bold">COVER</Text>
                        </View>
                    )}
                    <View className="absolute inset-0 flex-row justify-between items-center px-1">
                        {index > 0 ? (
                            <TouchableOpacity onPress={() => moveImage(index, 'left')} className="bg-black/50 w-6 h-6 rounded-full justify-center items-center">
                                <Text className="text-white font-bold">←</Text>
                            </TouchableOpacity>
                        ) : <View className="w-6" />}
                        {index < images.length - 1 ? (
                            <TouchableOpacity onPress={() => moveImage(index, 'right')} className="bg-black/50 w-6 h-6 rounded-full justify-center items-center">
                                <Text className="text-white font-bold">→</Text>
                            </TouchableOpacity>
                        ) : <View className="w-6" />}
                    </View>
                    <TouchableOpacity
                        onPress={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-white rounded-full w-6 h-6 justify-center items-center shadow-md border border-gray-200 z-10"
                    >
                        <Text className="text-red-500 font-bold text-xs">✕</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    };

    if (initialLoading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#0000ff" />
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView className="flex-1 bg-white">
                <Stack.Screen options={{ headerShown: false }} />

                <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.replace('/(landlord)/my-properties')}>
                        <Text className="text-blue-600 text-lg">Cancel</Text>
                    </TouchableOpacity>
                    <Text className="text-xl font-bold">{isEditing ? "Edit" : "New"}</Text>
                    <View className="w-10" />
                </View>

                <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 50 }}>
                    <View className="flex-row justify-between items-end mb-1">
                        <Text className="font-semibold text-gray-700 text-base">Photos <Text className="text-red-500">*</Text></Text>
                        <Text className={`text-xs ${images.length >= MAX_PHOTOS ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                            {images.length} / {MAX_PHOTOS}
                        </Text>
                    </View>
                    <Text className="text-gray-400 text-xs mb-3">Drag or use arrows to reorder. First is cover.</Text>

                    <View className={`mb-2 h-32 flex-row items-center p-2 rounded-xl border ${errors.photos ? 'border-red-500 bg-red-50' : 'border-transparent'}`}>
                        {images.length < MAX_PHOTOS && (
                            <TouchableOpacity onPress={pickImage} className="w-24 h-24 bg-gray-50 rounded-xl justify-center items-center border border-dashed border-gray-400 mr-3">
                                <Text className="text-2xl text-gray-400">+</Text>
                                <Text className="text-xs text-gray-400 font-medium">Add</Text>
                            </TouchableOpacity>
                        )}
                        <DraggableFlatList
                            data={images}
                            onDragEnd={({ data }) => setImages(data)}
                            keyExtractor={(item, index) => item.uri + index}
                            renderItem={renderDraggableItem}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            containerStyle={{ flexGrow: 0 }}
                        />
                    </View>
                    <RenderError field="photos" />
                    <View className="mb-4" />

                    <Text className="mb-2 font-semibold text-gray-700">Property Title <Text className="text-red-500">*</Text></Text>
                    <TextInput
                        className={`border rounded-lg p-3 ${errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        value={title} onChangeText={(t) => {setTitle(t); if(t) setErrors({...errors, title:''})}}
                        placeholder="e.g. Modern Apartment"
                    />
                    <RenderError field="title" />

                    <View className="mt-4" />
                    <Text className="mb-2 font-semibold text-gray-700">Price (RON) <Text className="text-red-500">*</Text></Text>
                    <TextInput
                        className={`border rounded-lg p-3 ${errors.price ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        value={price} onChangeText={(t) => {setPrice(t); if(t) setErrors({...errors, price:''})}}
                        keyboardType="numeric" placeholder="450"
                    />
                    <RenderError field="price" />

                    <View className="mt-4" />
                    <Text className="mb-2 font-semibold text-gray-700">Address <Text className="text-red-500">*</Text></Text>
                    <TextInput
                        className={`border rounded-lg p-3 ${errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        value={address} onChangeText={(t) => {setAddress(t); if(t) setErrors({...errors, address:''})}}
                        placeholder="Full Address"
                    />
                    <RenderError field="address" />

                    <View className="mt-4" />
                    <Text className="mb-2 font-semibold text-gray-700">Description</Text>
                    <TextInput
                        className="border border-gray-300 rounded-lg p-3 h-24"
                        value={description} onChangeText={setDescription}
                        multiline textAlignVertical="top" placeholder="Describe the property..."
                    />

                    <View className="mt-4" />
                    <Text className="mb-2 font-semibold text-gray-700">Layout Type</Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {/* 3. Handle NESPECIFICAT/null selection */}
                        {LAYOUT_OPTIONS.map((option) => {
                            const isSelected = option === 'NESPECIFICAT' ? layoutType === null : layoutType === option;
                            return (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => setLayoutType(option === 'NESPECIFICAT' ? null : option)}
                                    className={`px-3 py-2 rounded-lg border ${isSelected ? 'bg-black border-black' : 'bg-white border-gray-300'}`}
                                >
                                    <Text className={isSelected ? 'text-white' : 'text-gray-700'}>{option}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text className="mb-2 font-semibold text-gray-700">Surface (sqm) <Text className="text-red-500">*</Text></Text>
                    <TextInput
                        className={`border rounded-lg p-3 ${errors.surface ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        value={surface} onChangeText={(t) => {setSurface(t); if(t) setErrors({...errors, surface:''})}}
                        keyboardType="numeric" placeholder="e.g. 55"
                    />
                    <RenderError field="surface" />

                    <View className="mt-4" />
                    <Text className="mb-2 font-semibold text-gray-700">Number of Rooms <Text className="text-red-500">*</Text></Text>
                    <TextInput
                        className={`border rounded-lg p-3 ${errors.numberOfRooms ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        value={numberOfRooms} onChangeText={(t) => {setNumberOfRooms(t); if(t) setErrors({...errors, numberOfRooms:''})}}
                        keyboardType="numeric" placeholder="e.g. 2"
                    />
                    <RenderError field="numberOfRooms" />

                    <View className="flex-row justify-between items-center mb-6 mt-6">
                        <Text className="text-gray-700 font-medium">Extra Bathroom?</Text>
                        <Switch value={hasExtraBathroom} onValueChange={setHasExtraBathroom} />
                    </View>

                    <TriStateSelector label="Pet Friendly?" value={petFriendly} onChange={setPetFriendly} />
                    <TriStateSelector label="Smoker Friendly?" value={smokerFriendly} onChange={setSmokerFriendly} />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        className={`p-4 rounded-full items-center mb-10 ${loading ? 'bg-gray-400' : 'bg-black'}`}
                    >
                        {loading ? <ActivityIndicator color="white" /> :
                            <Text className="text-white font-bold text-lg">{isEditing ? "Update Property" : "Create Listing"}</Text>
                        }
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}