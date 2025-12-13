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

const ErrorColor = '#DC2626';

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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // --- NEW: INPUT SANITIZATION HANDLERS ---

    // For integer fields (Rooms)
    const handleIntegerChange = (field: string, text: string) => {
        // Remove anything that is NOT a number
        const cleaned = text.replace(/[^0-9]/g, '');
        updateField(field, cleaned);
    };

    // For decimal fields (Price, Surface)
    const handleDecimalChange = (field: string, text: string) => {
        // Remove non-numeric and non-dot characters
        let cleaned = text.replace(/[^0-9.]/g, '');

        // Prevent multiple dots: ensure only the first dot remains
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }

        updateField(field, cleaned);
    };
    // ----------------------------------------

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
            if (errors.images) {
                setErrors(prev => ({ ...prev, images: '' }));
            }
        }
    };

    const removeImage = (index: number) => {
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

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        if (!formData.title.trim()) { newErrors.title = 'Property title is required'; isValid = false; }
        if (!formData.price || parseFloat(formData.price) <= 0) { newErrors.price = 'Valid price is required'; isValid = false; }
        if (!formData.surface || parseFloat(formData.surface) <= 0) { newErrors.surface = 'Valid surface area is required'; isValid = false; }
        if (!formData.address.trim()) { newErrors.address = 'Address is required'; isValid = false; }
        if (!formData.numberOfRooms || parseInt(formData.numberOfRooms) <= 0) { newErrors.numberOfRooms = 'Number of rooms is required'; isValid = false; }
        if (images.length === 0) { newErrors.images = 'At least one image is required'; isValid = false; }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setSnackbar({ visible: true, message: 'Please fix the errors above', type: 'error' });
            return;
        }

        try {
            console.log('Starting property creation...');

            const imageFiles = await Promise.all(images.map(async (img, index) => {
                if (img.uri.startsWith('blob:')) {
                    const response = await fetch(img.uri);
                    const blob = await response.blob();
                    return new File([blob], `image_${index}.jpg`, { type: blob.type || 'image/jpeg' });
                } else {
                    return {
                        uri: img.uri,
                        type: 'image/jpeg',
                        name: `image_${index}.jpg`,
                    } as any;
                }
            }));

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

            const result = await createProperty(propertyData, imageFiles);

            if (result) {
                setSnackbar({ visible: true, message: 'Property created successfully!', type: 'success' });
                setTimeout(() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(landlord)');
                    }
                }, 1500);
            } else {
                setSnackbar({ visible: true, message: error || 'Failed to create property', type: 'error' });
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
                        style={[styles.input, errors.title && styles.inputError]}
                        value={formData.title}
                        onChangeText={(text) => updateField('title', text)}
                        placeholder="e.g., Modern Downtown Apartment"
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

                    <Text style={styles.label}>Price (€/month) *</Text>
                    <TextInput
                        style={[styles.input, errors.price && styles.inputError]}
                        value={formData.price}
                        // FIX: Use decimal handler
                        onChangeText={(text) => handleDecimalChange('price', text)}
                        placeholder="1200"
                        keyboardType="decimal-pad" // Use decimal-pad
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

                    <Text style={styles.label}>Surface (m²) *</Text>
                    <TextInput
                        style={[styles.input, errors.surface && styles.inputError]}
                        value={formData.surface}
                        // FIX: Use decimal handler
                        onChangeText={(text) => handleDecimalChange('surface', text)}
                        placeholder="85"
                        keyboardType="decimal-pad" // Use decimal-pad
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.surface && <Text style={styles.errorText}>{errors.surface}</Text>}

                    <Text style={styles.label}>Address *</Text>
                    <TextInput
                        style={[styles.input, errors.address && styles.inputError]}
                        value={formData.address}
                        onChangeText={(text) => updateField('address', text)}
                        placeholder="Street, City, Country"
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

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
                        style={[styles.input, errors.numberOfRooms && styles.inputError]}
                        value={formData.numberOfRooms}
                        // FIX: Use integer handler
                        onChangeText={(text) => handleIntegerChange('numberOfRooms', text)}
                        placeholder="2"
                        keyboardType="number-pad" // Use number-pad
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.numberOfRooms && <Text style={styles.errorText}>{errors.numberOfRooms}</Text>}

                    {/* ... Rest of the form remains unchanged ... */}

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

                {/* Images Section (unchanged from previous step, but included for completeness of file flow) */}
                <Card style={[styles.section, errors.images && styles.sectionError]}>
                    <Text style={styles.sectionTitle}>Images * (1-7 photos)</Text>
                    <Text style={styles.helperText}>Drag arrows to reorder. The first photo will be the cover.</Text>

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
                                <View style={styles.orderBadge}>
                                    <Text style={styles.orderText}>{index + 1}</Text>
                                </View>
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
                            </View>
                        ))}

                        {images.length < 7 && (
                            <TouchableOpacity
                                style={[styles.addImageButton, errors.images && styles.addImageButtonError]}
                                onPress={pickImages}
                            >
                                <Ionicons
                                    name="add"
                                    size={32}
                                    color={errors.images ? ErrorColor : Blue[600]}
                                />
                                <Text style={[styles.addImageText, errors.images && { color: ErrorColor }]}>
                                    Add Photo
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
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
    // (Styles remain exactly as they were in the previous file)
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
    sectionError: {
        borderColor: ErrorColor,
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.semibold,
        marginBottom: Spacing.md,
        color: Neutral[900],
    },
    helperText: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginBottom: Spacing.sm,
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
    inputError: {
        borderColor: ErrorColor,
        backgroundColor: '#FEF2F2',
    },
    errorText: {
        color: ErrorColor,
        fontSize: Typography.size.sm,
        marginTop: 4,
        marginLeft: 2,
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
        zIndex: 10,
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
        zIndex: 10,
    },
    orderText: {
        color: '#FFFFFF',
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
    },
    reorderButtons: {
        position: 'absolute',
        bottom: 4,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    reorderButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
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
    addImageButtonError: {
        borderColor: ErrorColor,
        backgroundColor: '#FEF2F2',
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