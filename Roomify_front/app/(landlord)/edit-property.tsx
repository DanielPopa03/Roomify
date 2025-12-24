import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Header, Button, Card, ImageCarousel, Snackbar } from '@/components/ui';
import { LocationPicker } from '@/components/location-picker';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePropertyMutations } from '@/hooks/useApi';
import { PropertiesApi, getImageUrl } from '@/services/api';

const ErrorColor = '#DC2626';

const LAYOUT_TYPES = ['DECOMANDAT', 'SEMIDECOMANDAT', 'NEDECOMANDAT'];
const TENANT_TYPES = ['Student', 'Students (Coliving)', 'Professional', 'Family', 'Family with Kids', 'Couple'];

interface ExistingImage { id: number; url: string; orderIndex: number; }
interface NewImage { uri: string; isNew: true; }
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
        latitude: null as number | null,
        longitude: null as number | null,
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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    useEffect(() => {
        const loadProperty = async () => {
            const parsedId = parseInt(propertyId);
            if (!propertyId || Number.isNaN(parsedId)) {
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
                        latitude: property.latitude || null,
                        longitude: property.longitude || null,
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

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;
        if (!formData.title.trim()) { newErrors.title = 'Property title is required'; isValid = false; }
        if (!formData.price || parseFloat(formData.price) <= 0) { newErrors.price = 'Valid price is required'; isValid = false; }
        if (!formData.surface || parseFloat(formData.surface) <= 0) { newErrors.surface = 'Valid surface area is required'; isValid = false; }
        if (!formData.address.trim()) { newErrors.address = 'Please search or pin a location on the map'; isValid = false; }
        else if (!formData.latitude || !formData.longitude) { newErrors.address = 'Location coordinates missing. Tap search or the map.'; isValid = false; }
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
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.address)}&format=json&limit=1`;
            const response = await fetch(url, { headers: { 'User-Agent': 'RoomifyApp/1.0' } });
            const data = await response.json();

            if (data && data.length > 0 && formData.latitude && formData.longitude) {
                const textLat = parseFloat(data[0].lat);
                const textLng = parseFloat(data[0].lon);
                const distKm = calculateDistance(textLat, textLng, formData.latitude, formData.longitude);

                if (distKm > 2.0) {
                    Alert.alert("Location Mismatch", `The address text and the map pin are too far apart (~${distKm.toFixed(1)}km).\n\nPlease either search for the location again or move the map pin closer to the address.`);
                    return;
                }
            }
        } catch (e) {
            console.warn("Validation skipped due to network error", e);
        }

        try {
            let newImageCounter = 0;
            const orderedIdentifiers = images.map((img) => {
                if ('id' in img) return `ID_${img.id}`;
                else {
                    const identifier = `NEW_${newImageCounter}`;
                    newImageCounter++;
                    return identifier;
                }
            });

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
                latitude: formData.latitude,
                longitude: formData.longitude,
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

            const result = await updateProperty(parseInt(propertyId), propertyData, newImageFiles.length > 0 ? newImageFiles : undefined);

            if (result) {
                setSnackbar({ visible: true, message: 'Property updated successfully!', type: 'success' });
                setTimeout(() => { router.canGoBack() ? router.back() : router.replace('/(landlord)'); }, 1500);
            } else if (error) {
                setSnackbar({ visible: true, message: error, type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setSnackbar({ visible: true, message: 'Failed to update property.', type: 'error' });
        }
    };

    const handleIntegerChange = (f:string, v:string) => updateField(f, v.replace(/[^0-9]/g, ''));
    const handleDecimalChange = (f:string, v:string) => updateField(f, v.replace(/[^0-9.]/g, ''));
    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission Required', 'Access needed.');
        const currentImageCount = images.length;
        if (currentImageCount >= 7) return Alert.alert('Limit Reached', 'Max 7 images.');
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8, selectionLimit: 7 - currentImageCount });
        if (!result.canceled) {
            const newImages: NewImage[] = result.assets.map(asset => ({ uri: asset.uri, isNew: true }));
            setImages(prev => [...prev, ...newImages]);
            if (errors.images) setErrors(prev => ({ ...prev, images: '' }));
        }
    };
    const removeImage = (index: number) => {
        const imageToRemove = images[index];
        if ('id' in imageToRemove) setDeletedImageIds(prev => [...prev, imageToRemove.id]);
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
        setFormData(prev => ({ ...prev, preferredTenants: prev.preferredTenants.includes(type) ? prev.preferredTenants.filter(t => t !== type) : [...prev.preferredTenants, type] }));
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Edit Property" user={user} showBackButton onBackPress={() => router.back()} />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

                    <Text style={styles.label}>Location (Search or Pin) *</Text>
                    <LocationPicker
                        addressValue={formData.address}
                        onAddressChange={(text) => updateField('address', text)}
                        onLocationPicked={handleLocationPicked}
                        initialLocation={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined}
                    />
                    {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

                    <Text style={styles.label}>Price (€/month) *</Text>
                    <TextInput
                        style={[styles.input, errors.price && styles.inputError]}
                        value={formData.price}
                        onChangeText={(text) => handleDecimalChange('price', text)}
                        placeholder="1200"
                        keyboardType="decimal-pad"
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

                    <Text style={styles.label}>Surface (m²) *</Text>
                    <TextInput
                        style={[styles.input, errors.surface && styles.inputError]}
                        value={formData.surface}
                        onChangeText={(text) => handleDecimalChange('surface', text)}
                        placeholder="85"
                        keyboardType="decimal-pad"
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.surface && <Text style={styles.errorText}>{errors.surface}</Text>}

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

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Property Details</Text>
                    <Text style={styles.label}>Number of Rooms *</Text>
                    <TextInput
                        style={[styles.input, errors.numberOfRooms && styles.inputError]}
                        value={formData.numberOfRooms}
                        onChangeText={(text) => handleIntegerChange('numberOfRooms', text)}
                        placeholder="2"
                        keyboardType="number-pad"
                        placeholderTextColor={Neutral[400]}
                    />
                    {errors.numberOfRooms && <Text style={styles.errorText}>{errors.numberOfRooms}</Text>}

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

                    <Text style={styles.label}>Smoker Friendly</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity style={[styles.optionButton, formData.smokerFriendly === true && styles.optionButtonActive]} onPress={() => updateField('smokerFriendly', true)}>
                            <Text style={[styles.optionButtonText, formData.smokerFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.optionButton, formData.smokerFriendly === false && styles.optionButtonActive]} onPress={() => updateField('smokerFriendly', false)}>
                            <Text style={[styles.optionButtonText, formData.smokerFriendly === false && styles.optionButtonTextActive]}>No</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Pet Friendly</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity style={[styles.optionButton, formData.petFriendly === true && styles.optionButtonActive]} onPress={() => updateField('petFriendly', true)}>
                            <Text style={[styles.optionButtonText, formData.petFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.optionButton, formData.petFriendly === false && styles.optionButtonActive]} onPress={() => updateField('petFriendly', false)}>
                            <Text style={[styles.optionButtonText, formData.petFriendly === false && styles.optionButtonTextActive]}>No</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Preferred Tenants</Text>
                    <View style={styles.tenantTypes}>
                        {TENANT_TYPES.map(type => (
                            <TouchableOpacity key={type} style={[styles.tenantTypeButton, formData.preferredTenants.includes(type) && styles.tenantTypeButtonActive]} onPress={() => toggleTenantType(type)}>
                                <Text style={[styles.tenantTypeText, formData.preferredTenants.includes(type) && styles.tenantTypeTextActive]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>

                <Card style={[styles.section, errors.images && styles.sectionError]}>
                    <Text style={styles.sectionTitle}>Images * (1-7 photos)</Text>
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
                        {images.map((img, index) => {
                            // FIX: Resolve the full URI using the helper for the grid as well
                            const resolvedUri = 'id' in img ? getImageUrl(img.url) : img.uri;

                            return (
                                <View key={index} style={styles.imageContainer}>
                                    <Image
                                        source={{ uri: resolvedUri }}
                                        style={styles.image}
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
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
                            );
                        })}
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
    container: { flex: 1, backgroundColor: Neutral[50] },
    content: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: Typography.size.base, color: Neutral[600] },
    section: { margin: Spacing.base, padding: Spacing.md },
    sectionError: { borderColor: ErrorColor, borderWidth: 1 },
    sectionTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.semibold, marginBottom: Spacing.md, color: Neutral[900] },
    label: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Neutral[700], marginBottom: Spacing.xs, marginTop: Spacing.sm },
    input: { borderWidth: 1, borderColor: Neutral[300], borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: 16, color: Neutral[900], backgroundColor: '#FFFFFF' },
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
    tenantTypeButton: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: Neutral[300], borderRadius: BorderRadius.full },
    tenantTypeButtonActive: { backgroundColor: Blue[600], borderColor: Blue[600] },
    tenantTypeText: { fontSize: Typography.size.sm, color: Neutral[700] },
    tenantTypeTextActive: { color: '#FFFFFF' },
    previewSection: { marginBottom: Spacing.md },
    previewLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[700], marginBottom: Spacing.xs },
    editLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: Neutral[600], marginBottom: Spacing.xs },
    imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    imageContainer: { width: 100, height: 100, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
    image: { width: '100%', height: '100%' },
    removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 12 },
    reorderButtons: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', gap: 4 },
    reorderButton: { backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    orderBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: Blue[600], borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    orderText: { color: '#FFFFFF', fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
    addImageButton: { width: 100, height: 100, borderWidth: 2, borderColor: Blue[600], borderStyle: 'dashed', borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    addImageButtonError: { borderColor: ErrorColor, backgroundColor: '#FEF2F2' },
    addImageText: { fontSize: Typography.size.sm, color: Blue[600], marginTop: Spacing.xs },
    actions: { padding: Spacing.base, paddingBottom: Spacing.xl },
});