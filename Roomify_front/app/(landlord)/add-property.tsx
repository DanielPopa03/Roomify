import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Header, Button, Card, ImageCarousel, Snackbar } from '@/components/ui';
import { LocationPicker } from '@/components/location-picker';
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
    const { createProperty, isLoading } = usePropertyMutations();

    const initialFormData = {
        title: '',
        price: '',
        surface: '',
        address: '',
        description: '',
        numberOfRooms: '',
        hasExtraBathroom: false,
        layoutType: '',
        smokerFriendly: null as boolean | null, // Tri-state: true, false, or null (Any)
        petFriendly: null as boolean | null,    // Tri-state: true, false, or null (Any)
        preferredTenants: [] as string[],       // Multiple selection
        latitude: null as number | null,
        longitude: null as number | null
    };

    const [formData, setFormData] = useState(initialFormData);
    const [images, setImages] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleLocationPicked = (location: { lat: number; lng: number; address?: string }) => {
        setFormData(prev => ({
            ...prev,
            latitude: location.lat,
            longitude: location.lng,
            address: location.address ? location.address : prev.address
        }));
    };

    // --- MODIFICATION: Multiple Selection Logic ---
    const toggleTenantType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            preferredTenants: prev.preferredTenants.includes(type)
                ? prev.preferredTenants.filter(t => t !== type)
                : [...prev.preferredTenants, type],
        }));
    };

    const moveImage = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= images.length) return;
        const newImages = [...images];
        const [movedItem] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedItem);
        setImages(newImages);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        if (!formData.title.trim()) { newErrors.title = 'Title is required'; isValid = false; }
        if (!formData.price || parseFloat(formData.price) <= 0) { newErrors.price = 'Valid price required'; isValid = false; }
        if (!formData.surface || parseFloat(formData.surface) <= 0) { newErrors.surface = 'Valid surface required'; isValid = false; }
        if (!formData.address.trim()) { newErrors.address = 'Location required'; isValid = false; }
        if (!formData.numberOfRooms || parseInt(formData.numberOfRooms) <= 0) { newErrors.numberOfRooms = 'Rooms required'; isValid = false; }
        if (images.length === 0) { newErrors.images = 'At least one photo required'; isValid = false; }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setSnackbar({ visible: true, message: 'Please fix the errors above', type: 'error' });
            return;
        }

        try {
            const propertyData = {
                title: formData.title,
                price: parseFloat(formData.price),
                surface: parseFloat(formData.surface),
                address: formData.address,
                description: formData.description || null,
                numberOfRooms: parseInt(formData.numberOfRooms),
                hasExtraBathroom: formData.hasExtraBathroom,
                layoutType: formData.layoutType || null,
                // These can now be null ("Any")
                smokerFriendly: formData.smokerFriendly,
                petFriendly: formData.petFriendly,
                // Array of strings for multiple selection
                preferredTenants: formData.preferredTenants.length > 0 ? formData.preferredTenants : null,
                latitude: formData.latitude,
                longitude: formData.longitude
            };

            const imageFiles = await Promise.all(images.map(async (img, index) => {
                if (img.uri.startsWith('blob:') || img.uri.startsWith('http')) {
                    const response = await fetch(img.uri);
                    const blob = await response.blob();
                    return new File([blob], `image_${index}.jpg`, { type: 'image/jpeg' });
                }
                return {
                    uri: img.uri,
                    type: 'image/jpeg',
                    name: `image_${index}.jpg`,
                } as any;
            }));

            const result = await createProperty(propertyData, imageFiles);

            if (result) {
                setSnackbar({ visible: true, message: 'Property created successfully!', type: 'success' });
                setFormData(initialFormData);
                setImages([]);
                setTimeout(() => {
                    router.canGoBack() ? router.back() : router.replace('/(landlord)');
                }, 1500);
            }
        } catch (err) {
            console.error("Upload error:", err);
            setSnackbar({ visible: true, message: 'Failed to create property.', type: 'error' });
        }
    };

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission Required', 'Access needed.');
        const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 7 - images.length
        });
        if (!r.canceled) {
            setImages(p => [...p, ...r.assets]);
            if (errors.images) setErrors(p => ({...p, images: ''}));
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Add Property" user={user} showBackButton onBackPress={() => router.back()} />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* --- BASIC INFORMATION --- */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>

                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={[styles.input, errors.title && styles.inputError]}
                        value={formData.title}
                        onChangeText={(t) => updateField('title', t)}
                        placeholder="e.g., Modern Downtown Apartment"
                        placeholderTextColor={Neutral[400]}
                    />

                    <Text style={styles.label}>Location (Search or Pin) *</Text>
                    <LocationPicker
                        addressValue={formData.address}
                        onAddressChange={(t) => updateField('address', t)}
                        onLocationPicked={handleLocationPicked}
                    />

                    <Text style={styles.label}>Price (€/month) *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.price}
                        onChangeText={(t) => updateField('price', t.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder="1200"
                        placeholderTextColor={Neutral[400]}
                    />

                    <Text style={styles.label}>Surface (m²) *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.surface}
                        onChangeText={(t) => updateField('surface', t.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder="85"
                        placeholderTextColor={Neutral[400]}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(t) => updateField('description', t)}
                        placeholder="Describe your property..."
                        placeholderTextColor={Neutral[400]}
                        multiline
                        numberOfLines={4}
                    />
                </Card>

                {/* --- PROPERTY DETAILS --- */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Property Details</Text>

                    <Text style={styles.label}>Number of Rooms *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.numberOfRooms}
                        onChangeText={(t) => updateField('numberOfRooms', t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        placeholder="2"
                        placeholderTextColor={Neutral[400]}
                    />

                    <View style={styles.checkboxContainer}>
                        <TouchableOpacity style={styles.checkbox} onPress={() => updateField('hasExtraBathroom', !formData.hasExtraBathroom)}>
                            <Ionicons name={formData.hasExtraBathroom ? 'checkbox' : 'square-outline'} size={24} color={formData.hasExtraBathroom ? Blue[600] : Neutral[400]} />
                            <Text style={styles.checkboxLabel}>Has Extra Bathroom</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Layout Type</Text>
                    <View style={styles.optionsRow}>
                        {LAYOUT_TYPES.map(type => (
                            <TouchableOpacity key={type} style={[styles.optionButton, formData.layoutType === type && styles.optionButtonActive]} onPress={() => updateField('layoutType', type)}>
                                <Text style={[styles.optionButtonText, formData.layoutType === type && styles.optionButtonTextActive]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* --- SMOKER FRIENDLY (YES / NO / ANY) --- */}
                    <Text style={styles.label}>Smoker Friendly?</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity style={[styles.optionButton, formData.smokerFriendly === true && styles.optionButtonActive]} onPress={() => updateField('smokerFriendly', true)}>
                            <Text style={[styles.optionButtonText, formData.smokerFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.optionButton, formData.smokerFriendly === false && styles.optionButtonActive]} onPress={() => updateField('smokerFriendly', false)}>
                            <Text style={[styles.optionButtonText, formData.smokerFriendly === false && styles.optionButtonTextActive]}>No</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.optionButton, formData.smokerFriendly === null && styles.optionButtonActive]} onPress={() => updateField('smokerFriendly', null)}>
                            <Text style={[styles.optionButtonText, formData.smokerFriendly === null && styles.optionButtonTextActive]}>Any</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- PET FRIENDLY (YES / NO / ANY) --- */}
                    <Text style={styles.label}>Pet Friendly?</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity style={[styles.optionButton, formData.petFriendly === true && styles.optionButtonActive]} onPress={() => updateField('petFriendly', true)}>
                            <Text style={[styles.optionButtonText, formData.petFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.optionButton, formData.petFriendly === false && styles.optionButtonActive]} onPress={() => updateField('petFriendly', false)}>
                            <Text style={[styles.optionButtonText, formData.petFriendly === false && styles.optionButtonTextActive]}>No</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.optionButton, formData.petFriendly === null && styles.optionButtonActive]} onPress={() => updateField('petFriendly', null)}>
                            <Text style={[styles.optionButtonText, formData.petFriendly === null && styles.optionButtonTextActive]}>Any</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- MULTIPLE TENANT TYPES --- */}
                    <Text style={styles.label}>Preferred Tenants (Select multiple)</Text>
                    <View style={styles.tenantTypes}>
                        {TENANT_TYPES.map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.tenantChip, formData.preferredTenants.includes(type) && styles.activeTenantChip]}
                                onPress={() => toggleTenantType(type)}
                            >
                                <Text style={[styles.tenantText, formData.preferredTenants.includes(type) && styles.activeTenantText]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>

                {/* --- IMAGES SECTION --- */}
                <Card style={[styles.section, errors.images && styles.sectionError]}>
                    <Text style={styles.sectionTitle}>Images * (1-7 photos)</Text>

                    {images.length > 0 && (
                        <View style={styles.previewSection}>
                            <Text style={styles.previewLabel}>Preview:</Text>
                            <ImageCarousel images={images.map(img => img.uri)} height={250} showPageIndicator enableZoom />
                        </View>
                    )}

                    <Text style={styles.editLabel}>Edit Images (use arrows to reorder):</Text>
                    <View style={styles.imagesGrid}>
                        {images.map((img, index) => (
                            <View key={index} style={styles.imageContainer}>
                                <Image source={{ uri: img.uri }} style={styles.image} resizeMode="cover" />
                                <TouchableOpacity style={styles.removeImageButton} onPress={() => setImages(images.filter((_, i) => i !== index))}>
                                    <Ionicons name="close-circle" size={24} color={Neutral[700]} />
                                </TouchableOpacity>

                                <View style={styles.reorderButtons}>
                                    {index > 0 && (
                                        <TouchableOpacity style={styles.reorderButton} onPress={() => moveImage(index, index - 1)}>
                                            <Ionicons name="chevron-back" size={16} color="#FFF" />
                                        </TouchableOpacity>
                                    )}
                                    {index < images.length - 1 && (
                                        <TouchableOpacity style={styles.reorderButton} onPress={() => moveImage(index, index + 1)}>
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
                            <TouchableOpacity style={[styles.addImageButton, errors.images && styles.addImageButtonError]} onPress={pickImages}>
                                <Ionicons name="add" size={32} color={errors.images ? ErrorColor : Blue[600]} />
                                <Text style={[styles.addImageText, errors.images && { color: ErrorColor }]}>Add Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
                </Card>

                <View style={styles.actions}>
                    <Button title={isLoading ? 'Creating...' : 'Create Property'} variant="primary" onPress={handleSubmit} disabled={isLoading} loading={isLoading} fullWidth />
                </View>
            </ScrollView>
            <Snackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar(p => ({...p, visible: false}))} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    content: { flex: 1 },
    section: { margin: Spacing.base, padding: Spacing.md },
    sectionError: { borderColor: ErrorColor, borderWidth: 1 },
    sectionTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.semibold, marginBottom: Spacing.md, color: Neutral[900] },
    label: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Neutral[700], marginBottom: Spacing.xs, marginTop: Spacing.sm },
    input: { borderWidth: 1, borderColor: Neutral[300], borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: 16, color: Neutral[900], backgroundColor: '#FFFFFF', textAlignVertical: 'center' },
    inputError: { borderColor: ErrorColor, backgroundColor: '#FEF2F2' },
    errorText: { color: ErrorColor, fontSize: Typography.size.sm, marginTop: 4, marginLeft: 2 },
    textArea: { height: 100, textAlignVertical: 'top' },
    checkboxContainer: { marginTop: Spacing.sm },
    checkbox: { flexDirection: 'row', alignItems: 'center' },
    checkboxLabel: { fontSize: Typography.size.base, marginLeft: Spacing.xs, color: Neutral[700] },
    optionsRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
    optionButton: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, borderWidth: 1, borderColor: Neutral[300], borderRadius: BorderRadius.md, alignItems: 'center' },
    optionButtonActive: { backgroundColor: Blue[600], borderColor: Blue[600] },
    optionButtonText: { fontSize: Typography.size.sm, color: Neutral[700] },
    optionButtonTextActive: { color: '#FFFFFF', fontWeight: Typography.weight.semibold },
    tenantTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
    tenantChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Neutral[300], backgroundColor: '#fff' },
    activeTenantChip: { backgroundColor: Blue[50], borderColor: Blue[600] },
    tenantText: { fontSize: 12, color: Neutral[700] },
    activeTenantText: { color: Blue[700], fontWeight: '600' },
    previewSection: { marginBottom: Spacing.md },
    previewLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[700], marginBottom: Spacing.xs },
    editLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: Neutral[600], marginBottom: Spacing.xs },
    imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    imageContainer: { width: 100, height: 100, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
    image: { width: '100%', height: '100%' },
    removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12 },
    reorderButtons: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', gap: 4 },
    reorderButton: { backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    orderBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: Blue[600], borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    orderText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
    addImageButton: { width: 100, height: 100, borderWidth: 2, borderColor: Blue[600], borderStyle: 'dashed', borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    addImageButtonError: { borderColor: ErrorColor, backgroundColor: '#FEF2F2' },
    addImageText: { fontSize: Typography.size.sm, color: Blue[600], marginTop: Spacing.xs },
    actions: { padding: Spacing.base, paddingBottom: Spacing.xl },
});