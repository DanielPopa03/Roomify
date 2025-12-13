import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Header, Button, Card, ImageCarousel } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePropertyMutations } from '@/hooks/useApi';
import { PropertiesApi, getImageUrl } from '@/services/api';

const LAYOUT_TYPES = ['DECOMANDAT', 'SEMIDECOMANDAT', 'NEDECOMANDAT'];
const TENANT_TYPES = ['Student', 'Students (Coliving)', 'Professional', 'Family', 'Family with Kids', 'Couple'];

interface ExistingImage {
    id: number;
    url: string;
    orderIndex: number;
}

interface NewImage {
    uri: string;
    isNew: true;
}

type ImageItem = ExistingImage | NewImage;

export default function EditPropertyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, getAccessToken } = useAuth();
    const params = useLocalSearchParams();
    const propertyId = params.id as string;
    
    const { updateProperty, isLoading, error } = usePropertyMutations();

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

    const [images, setImages] = useState<ImageItem[]>([]);
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
    const [loadingProperty, setLoadingProperty] = useState(true);

    // Load property data
    useEffect(() => {
        const loadProperty = async () => {
            // Guard against invalid propertyId
            const parsedId = parseInt(propertyId);
            if (!propertyId || Number.isNaN(parsedId)) {
                console.error('Invalid propertyId:', propertyId);
                Alert.alert('Error', 'Invalid property ID');
                router.back();
                return;
            }

            try {
                const token = await getAccessToken();
                if (!token) {
                    Alert.alert('Error', 'Not authenticated');
                    router.back();
                    return;
                }

                const response = await PropertiesApi.getById(token, parsedId);
                if (response.data) {
                    const property = response.data;
                    setFormData({
                        title: property.title,
                        price: property.price.toString(),
                        surface: property.surface.toString(),
                        address: property.address,
                        description: property.description || '',
                        numberOfRooms: property.numberOfRooms.toString(),
                        hasExtraBathroom: property.hasExtraBathroom,
                        layoutType: property.layoutType || '',
                        smokerFriendly: property.smokerFriendly ?? null,
                        petFriendly: property.petFriendly ?? null,
                        preferredTenants: property.preferredTenants || [],
                    });
                    setImages(property.images || []);
                } else {
                    Alert.alert('Error', 'Failed to load property');
                    router.back();
                }
            } catch (err) {
                console.error('Load property error:', err);
                Alert.alert('Error', 'Failed to load property');
                router.back();
            } finally {
                setLoadingProperty(false);
            }
        };

        loadProperty();
    }, [propertyId]);

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }

        const currentImageCount = images.length;
        if (currentImageCount >= 7) {
            Alert.alert('Limit Reached', 'You can only have up to 7 images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 7 - currentImageCount,
        });

        if (!result.canceled && result.assets) {
            const newImages: NewImage[] = result.assets.slice(0, 7 - currentImageCount).map(asset => ({
                uri: asset.uri,
                isNew: true,
            }));
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        const imageToRemove = images[index];
        
        // If it's an existing image (has id), mark it for deletion
        if ('id' in imageToRemove) {
            setDeletedImageIds(prev => [...prev, imageToRemove.id]);
        }
        
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const moveImage = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= images.length) return;
        
        const newImages = [...images];
        const [movedItem] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedItem);
        setImages(newImages);
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
            // Build orderedIdentifiers array
            const orderedIdentifiers = images.map((img, index) => {
                if ('id' in img) {
                    return `ID_${img.id}`;
                } else {
                    return `NEW_${index}`;
                }
            });

            // Extract new images
            const newImageFiles = images
                .filter((img): img is NewImage => 'isNew' in img)
                .map((img, index) => ({
                    uri: img.uri,
                    type: 'image/jpeg',
                    name: `image_${index}.jpg`,
                } as any));

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
                deletedImageIds: deletedImageIds.length > 0 ? deletedImageIds : null,
                orderedIdentifiers,
            };

            const result = await updateProperty(
                parseInt(propertyId),
                propertyData,
                newImageFiles.length > 0 ? newImageFiles : undefined
            );

            if (result) {
                Alert.alert('Success', 'Property updated successfully!', [
                    { text: 'OK', onPress: () => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(landlord)');
                        }
                    }}
                ]);
            } else if (error) {
                Alert.alert('Error', error);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update property. Please try again.');
            console.error(err);
        }
    };

    if (loadingProperty) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Header
                    title="Edit Property"
                    user={user}
                    showBackButton
                    onBackPress={() => router.back()}
                />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading property...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header
                title="Edit Property"
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
                    
                    {/* Preview Gallery */}
                    {images.length > 0 && (
                        <View style={styles.previewSection}>
                            <Text style={styles.previewLabel}>Preview:</Text>
                            <ImageCarousel
                                images={images.map(img => 'id' in img ? getImageUrl(img.url) : img.uri)}
                                height={250}
                                showPageIndicator={true}
                                enableZoom={true}
                            />
                        </View>
                    )}
                    
                    <Text style={styles.editLabel}>Edit Images (drag to reorder):</Text>
                    <View style={styles.imagesGrid}>
                        {images.map((img, index) => (
                            <View key={index} style={styles.imageContainer}>
                                <Image 
                                    source={{ uri: 'id' in img ? img.url : img.uri }} 
                                    style={styles.image} 
                                />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => removeImage(index)}
                                >
                                    <Ionicons name="close-circle" size={24} color={Neutral[700]} />
                                </TouchableOpacity>
                                
                                {/* Reorder buttons */}
                                <View style={styles.reorderButtons}>
                                    {index > 0 && (
                                        <TouchableOpacity
                                            style={styles.reorderButton}
                                            onPress={() => moveImage(index, index - 1)}
                                        >
                                            <Ionicons name="chevron-back" size={16} color="#FFF" />
                                        </TouchableOpacity>
                                    )}
                                    {index < images.length - 1 && (
                                        <TouchableOpacity
                                            style={styles.reorderButton}
                                            onPress={() => moveImage(index, index + 1)}
                                        >
                                            <Ionicons name="chevron-forward" size={16} color="#FFF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                
                                <View style={styles.orderBadge}>
                                    <Text style={styles.orderText}>{index + 1}</Text>
                                </View>
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
                        title={isLoading ? 'Updating...' : 'Update Property'}
                        variant="primary"
                        onPress={handleSubmit}
                        disabled={isLoading}
                        loading={isLoading}
                        fullWidth
                    />
                </View>
            </ScrollView>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: Typography.size.base,
        color: Neutral[600],
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
    previewSection: {
        marginBottom: Spacing.md,
    },
    previewLabel: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        color: Neutral[700],
        marginBottom: Spacing.xs,
    },
    editLabel: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
        color: Neutral[600],
        marginBottom: Spacing.xs,
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
        position: 'relative',
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
    reorderButtons: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        flexDirection: 'row',
        gap: 4,
    },
    reorderButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: Blue[600],
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderText: {
        color: '#FFFFFF',
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
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
