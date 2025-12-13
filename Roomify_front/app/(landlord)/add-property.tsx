import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Header, Button, Card, Snackbar } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePropertyMutations } from '@/hooks/useApi';

const LAYOUT_TYPES = ['DECOMANDAT', 'SEMIDECOMANDAT', 'NEDECOMANDAT'];
const TENANT_TYPES = ['Student', 'Students (Coliving)', 'Professional', 'Family', 'Family with Kids', 'Couple'];

export default function AddPropertyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { createProperty, isLoading, error } = usePropertyMutations();

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        surface: '',
        address: '',
        description: '',
        numberOfRooms: '',
        hasExtraBathroom: false,
        layoutType: '',
        smokerFriendly: null as boolean | null,
        petFriendly: null as boolean | null,
        preferredTenants: [] as string[],
    });

    const [images, setImages] = useState<any[]>([]);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 7 - images.length,
        });

        if (!result.canceled && result.assets) {
            setImages(prev => [...prev, ...result.assets.slice(0, 7 - prev.length)]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const toggleTenantType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            preferredTenants: prev.preferredTenants.includes(type)
                ? prev.preferredTenants.filter(t => t !== type)
                : [...prev.preferredTenants, type],
        }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.title.trim()) {
            Alert.alert('Error', 'Please enter a property title');
            return;
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            Alert.alert('Error', 'Please enter a valid price');
            return;
        }
        if (!formData.surface || parseFloat(formData.surface) <= 0) {
            Alert.alert('Error', 'Please enter a valid surface area');
            return;
        }
        if (!formData.address.trim()) {
            Alert.alert('Error', 'Please enter an address');
            return;
        }
        if (!formData.numberOfRooms || parseInt(formData.numberOfRooms) <= 0) {
            Alert.alert('Error', 'Please enter number of rooms');
            return;
        }
        if (images.length === 0) {
            Alert.alert('Error', 'Please add at least one image');
            return;
        }

        try {
            console.log('Starting property creation...');
            console.log('Images count:', images.length);
            
            // Convert images to proper format for API
            // Handle both web (blob URLs) and native (file:// URIs)
            const imageFiles = await Promise.all(images.map(async (img, index) => {
                console.log(`Image ${index} uri:`, img.uri);
                
                // Check if running on web (blob URL)
                if (img.uri.startsWith('blob:')) {
                    // Web: Fetch the blob and convert to File
                    console.log(`Image ${index}: Converting blob URL to File`);
                    const response = await fetch(img.uri);
                    const blob = await response.blob();
                    console.log(`Image ${index} blob size:`, blob.size, 'type:', blob.type);
                    return new File([blob], `image_${index}.jpg`, { type: blob.type || 'image/jpeg' });
                } else {
                    // Native: Use the React Native format with uri, type, name
                    console.log(`Image ${index}: Using native format`);
                    return {
                        uri: img.uri,
                        type: 'image/jpeg',
                        name: `image_${index}.jpg`,
                    } as any;
                }
            }));

            console.log('Prepared image files:', imageFiles.length);

            const propertyData = {
                title: formData.title,
                price: parseFloat(formData.price),
                surface: parseFloat(formData.surface),
                address: formData.address,
                description: formData.description || null,
                numberOfRooms: parseInt(formData.numberOfRooms),
                hasExtraBathroom: formData.hasExtraBathroom,
                layoutType: formData.layoutType || null,
                smokerFriendly: formData.smokerFriendly,
                petFriendly: formData.petFriendly,
                preferredTenants: formData.preferredTenants.length > 0 ? formData.preferredTenants : null,
            };

            console.log('Property data:', propertyData);
            console.log('Calling createProperty API...');
            
            const result = await createProperty(propertyData, imageFiles);

            console.log('Create property result:', result);
            console.log('Create property error:', error);

            if (result) {
                console.log('Property created successfully!');
                // Show success snackbar and navigate back after a short delay
                setSnackbar({ visible: true, message: 'Property created successfully!', type: 'success' });
                setTimeout(() => {
                    // Use replace to ensure clean navigation back to index
                    // This avoids stacking issues
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        // Fallback: navigate to index if can't go back
                        router.replace('/(landlord)');
                    }
                }, 1500);
            } else {
                console.error('Property creation returned null');
                if (error) {
                    console.error('Error from hook:', error);
                    setSnackbar({ visible: true, message: error, type: 'error' });
                } else {
                    setSnackbar({ visible: true, message: 'Failed to create property', type: 'error' });
                }
            }
        } catch (err) {
            console.error('Exception in handleSubmit:', err);
            setSnackbar({ visible: true, message: 'Failed to create property. Please try again.', type: 'error' });
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header
                title="Add Property"
                user={user}
                showBackButton
                onBackPress={() => router.back()}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Basic Info */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>
                    
                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.title}
                        onChangeText={(text) => updateField('title', text)}
                        placeholder="e.g., Modern Downtown Apartment"
                        placeholderTextColor={Neutral[400]}
                    />

                    <Text style={styles.label}>Price (€/month) *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.price}
                        onChangeText={(text) => updateField('price', text)}
                        placeholder="1200"
                        keyboardType="numeric"
                        placeholderTextColor={Neutral[400]}
                    />

                    <Text style={styles.label}>Surface (m²) *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.surface}
                        onChangeText={(text) => updateField('surface', text)}
                        placeholder="85"
                        keyboardType="numeric"
                        placeholderTextColor={Neutral[400]}
                    />

                    <Text style={styles.label}>Address *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.address}
                        onChangeText={(text) => updateField('address', text)}
                        placeholder="Street, City, Country"
                        placeholderTextColor={Neutral[400]}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(text) => updateField('description', text)}
                        placeholder="Describe your property..."
                        placeholderTextColor={Neutral[400]}
                        multiline
                        numberOfLines={4}
                    />
                </Card>

                {/* Property Details */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Property Details</Text>
                    
                    <Text style={styles.label}>Number of Rooms *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.numberOfRooms}
                        onChangeText={(text) => updateField('numberOfRooms', text)}
                        placeholder="2"
                        keyboardType="numeric"
                        placeholderTextColor={Neutral[400]}
                    />

                    <View style={styles.checkboxContainer}>
                        <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => updateField('hasExtraBathroom', !formData.hasExtraBathroom)}
                        >
                            <Ionicons
                                name={formData.hasExtraBathroom ? 'checkbox' : 'square-outline'}
                                size={24}
                                color={formData.hasExtraBathroom ? Blue[600] : Neutral[400]}
                            />
                            <Text style={styles.checkboxLabel}>Has Extra Bathroom</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Layout Type</Text>
                    <View style={styles.optionsRow}>
                        {LAYOUT_TYPES.map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.optionButton,
                                    formData.layoutType === type && styles.optionButtonActive
                                ]}
                                onPress={() => updateField('layoutType', type)}
                            >
                                <Text style={[
                                    styles.optionButtonText,
                                    formData.layoutType === type && styles.optionButtonTextActive
                                ]}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Smoker Friendly</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity
                            style={[styles.optionButton, formData.smokerFriendly === true && styles.optionButtonActive]}
                            onPress={() => updateField('smokerFriendly', true)}
                        >
                            <Text style={[styles.optionButtonText, formData.smokerFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, formData.smokerFriendly === false && styles.optionButtonActive]}
                            onPress={() => updateField('smokerFriendly', false)}
                        >
                            <Text style={[styles.optionButtonText, formData.smokerFriendly === false && styles.optionButtonTextActive]}>No</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Pet Friendly</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity
                            style={[styles.optionButton, formData.petFriendly === true && styles.optionButtonActive]}
                            onPress={() => updateField('petFriendly', true)}
                        >
                            <Text style={[styles.optionButtonText, formData.petFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, formData.petFriendly === false && styles.optionButtonActive]}
                            onPress={() => updateField('petFriendly', false)}
                        >
                            <Text style={[styles.optionButtonText, formData.petFriendly === false && styles.optionButtonTextActive]}>No</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Preferred Tenants</Text>
                    <View style={styles.tenantTypes}>
                        {TENANT_TYPES.map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.tenantTypeButton,
                                    formData.preferredTenants.includes(type) && styles.tenantTypeButtonActive
                                ]}
                                onPress={() => toggleTenantType(type)}
                            >
                                <Text style={[
                                    styles.tenantTypeText,
                                    formData.preferredTenants.includes(type) && styles.tenantTypeTextActive
                                ]}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>

                {/* Images */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Images * (1-7 photos)</Text>
                    
                    <View style={styles.imagesGrid}>
                        {images.map((img, index) => (
                            <View key={index} style={styles.imageContainer}>
                                <Image source={{ uri: img.uri }} style={styles.image} />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => removeImage(index)}
                                >
                                    <Ionicons name="close-circle" size={24} color={Neutral[700]} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        
                        {images.length < 7 && (
                            <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                                <Ionicons name="add" size={32} color={Blue[600]} />
                                <Text style={styles.addImageText}>Add Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Card>

                <View style={styles.actions}>
                    <Button
                        title={isLoading ? 'Creating...' : 'Create Property'}
                        variant="primary"
                        onPress={handleSubmit}
                        disabled={isLoading}
                        loading={isLoading}
                        fullWidth
                    />
                </View>
            </ScrollView>
            
            {/* Success/Error Snackbar */}
            <Snackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar(prev => ({ ...prev, visible: false }))}
                duration={3000}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Neutral[50],
    },
    content: {
        flex: 1,
    },
    section: {
        margin: Spacing.base,
        padding: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.semibold,
        marginBottom: Spacing.md,
        color: Neutral[900],
    },
    label: {
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
        color: Neutral[700],
        marginBottom: Spacing.xs,
        marginTop: Spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: Neutral[300],
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        fontSize: 16,
        color: Neutral[900],
        backgroundColor: '#FFFFFF',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    checkboxContainer: {
        marginTop: Spacing.sm,
    },
    checkbox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkboxLabel: {
        fontSize: Typography.size.base,
        marginLeft: Spacing.xs,
        color: Neutral[700],
    },
    optionsRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginTop: Spacing.xs,
    },
    optionButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
        borderWidth: 1,
        borderColor: Neutral[300],
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    optionButtonActive: {
        backgroundColor: Blue[600],
        borderColor: Blue[600],
    },
    optionButtonText: {
        fontSize: Typography.size.sm,
        color: Neutral[700],
    },
    optionButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: Typography.weight.semibold,
    },
    tenantTypes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: Spacing.xs,
    },
    tenantTypeButton: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: Neutral[300],
        borderRadius: BorderRadius.full,
    },
    tenantTypeButtonActive: {
        backgroundColor: Blue[600],
        borderColor: Blue[600],
    },
    tenantTypeText: {
        fontSize: Typography.size.sm,
        color: Neutral[700],
    },
    tenantTypeTextActive: {
        color: '#FFFFFF',
    },
    imagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    imageContainer: {
        width: 100,
        height: 100,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
    },
    addImageButton: {
        width: 100,
        height: 100,
        borderWidth: 2,
        borderColor: Blue[600],
        borderStyle: 'dashed',
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageText: {
        fontSize: Typography.size.sm,
        color: Blue[600],
        marginTop: Spacing.xs,
    },
    actions: {
        padding: Spacing.base,
        paddingBottom: Spacing.xl,
    },
});
