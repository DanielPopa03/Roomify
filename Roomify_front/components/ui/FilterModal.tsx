import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LocationPicker } from '@/components/location-picker';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Preferences } from '@/constants/types';

const LAYOUT_TYPES = ['DECOMANDAT', 'SEMIDECOMANDAT', 'NEDECOMANDAT'];
const TENANT_TYPES = ['Student', 'Students (Coliving)', 'Professional', 'Family', 'Family with Kids', 'Couple'];

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    initialPreferences?: Preferences;
    onApplyFilters: (preferences: Preferences) => void;
}

export const FilterModal = ({
    visible,
    onClose,
    initialPreferences,
    onApplyFilters,
}: FilterModalProps) => {
    const insets = useSafeAreaInsets();
    const [addressValue, setAddressValue] = useState('');
    const [filters, setFilters] = useState<Preferences>({
        minPrice: undefined,
        maxPrice: undefined,
        minSurface: undefined,
        maxSurface: undefined,
        minRooms: undefined,
        maxRooms: undefined,
        layoutTypes: [],
        smokerFriendly: undefined,
        petFriendly: undefined,
        preferredTenants: [],
        searchLatitude: undefined,
        searchLongitude: undefined,
        searchRadiusKm: undefined,
    });

    // Update filters when modal opens with initial preferences
    useEffect(() => {
        if (visible && initialPreferences) {
            setFilters({
                minPrice: initialPreferences.minPrice,
                maxPrice: initialPreferences.maxPrice,
                minSurface: initialPreferences.minSurface,
                maxSurface: initialPreferences.maxSurface,
                minRooms: initialPreferences.minRooms,
                maxRooms: initialPreferences.maxRooms,
                layoutTypes: initialPreferences.layoutTypes || [],
                smokerFriendly: initialPreferences.smokerFriendly,
                petFriendly: initialPreferences.petFriendly,
                preferredTenants: initialPreferences.preferredTenants || [],
                searchLatitude: initialPreferences.searchLatitude,
                searchLongitude: initialPreferences.searchLongitude,
                searchRadiusKm: initialPreferences.searchRadiusKm,
            });
        }
    }, [visible, initialPreferences]);

    const updateFilter = (field: keyof Preferences, value: any) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const toggleLayoutType = (type: string) => {
        setFilters(prev => ({
            ...prev,
            layoutTypes: prev.layoutTypes?.includes(type)
                ? prev.layoutTypes.filter(t => t !== type)
                : [...(prev.layoutTypes || []), type],
        }));
    };

    const toggleTenantType = (type: string) => {
        setFilters(prev => ({
            ...prev,
            preferredTenants: prev.preferredTenants?.includes(type)
                ? prev.preferredTenants.filter(t => t !== type)
                : [...(prev.preferredTenants || []), type],
        }));
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleLocationPicked = (location: { lat: number; lng: number; address?: string }) => {
        setAddressValue(location.address || '');
        setFilters(prev => ({
            ...prev,
            searchLatitude: location.lat,
            searchLongitude: location.lng,
            searchRadiusKm: prev.searchRadiusKm || 1, // Default to 1 km if not set
        }));
    };

    const handleApplyFilters = async () => {
        // Validate location if both address and coordinates are present
        if (filters.searchLatitude != null && filters.searchLongitude != null) {
            try {
                // Use LocationPicker to get the address text - we'll validate the location
                // against Nominatim to ensure address and coordinates match
                // This follows the same pattern as edit-property.tsx
                // For now, we just apply the filters without strict validation
                // since the location was picked from the map/search already
            } catch (e) {
                console.warn("Location validation skipped:", e);
            }
        }

        onApplyFilters(filters);
        onClose();
    };

    const handleClearFilters = () => {
        setFilters({
            minPrice: undefined,
            maxPrice: undefined,
            minSurface: undefined,
            maxSurface: undefined,
            minRooms: undefined,
            maxRooms: undefined,
            layoutTypes: [],
            smokerFriendly: undefined,
            petFriendly: undefined,
            preferredTenants: [],
            searchLatitude: undefined,
            searchLongitude: undefined,
            searchRadiusKm: undefined,
        });
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: Neutral[50] }}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <Text style={styles.headerTitle}>Filter Properties</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={Neutral[900]} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Price Range */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Price Range (€/month)</Text>
                        <View style={styles.rangeRow}>
                            <View style={styles.rangeInput}>
                                <Text style={styles.label}>Min</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="€"
                                    keyboardType="decimal-pad"
                                    placeholderTextColor={Neutral[400]}
                                    value={filters.minPrice?.toString() || ''}
                                    onChangeText={(text) => updateFilter('minPrice', text ? parseFloat(text) : undefined)}
                                />
                            </View>
                            <View style={styles.rangeInput}>
                                <Text style={styles.label}>Max</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="€"
                                    keyboardType="decimal-pad"
                                    placeholderTextColor={Neutral[400]}
                                    value={filters.maxPrice?.toString() || ''}
                                    onChangeText={(text) => updateFilter('maxPrice', text ? parseFloat(text) : undefined)}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Surface Area */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Surface Area (m²)</Text>
                        <View style={styles.rangeRow}>
                            <View style={styles.rangeInput}>
                                <Text style={styles.label}>Min</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="m²"
                                    keyboardType="decimal-pad"
                                    placeholderTextColor={Neutral[400]}
                                    value={filters.minSurface?.toString() || ''}
                                    onChangeText={(text) => updateFilter('minSurface', text ? parseFloat(text) : undefined)}
                                />
                            </View>
                            <View style={styles.rangeInput}>
                                <Text style={styles.label}>Max</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="m²"
                                    keyboardType="decimal-pad"
                                    placeholderTextColor={Neutral[400]}
                                    value={filters.maxSurface?.toString() || ''}
                                    onChangeText={(text) => updateFilter('maxSurface', text ? parseFloat(text) : undefined)}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Number of Rooms */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Number of Rooms</Text>
                        <View style={styles.rangeRow}>
                            <View style={styles.rangeInput}>
                                <Text style={styles.label}>Min</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Rooms"
                                    keyboardType="number-pad"
                                    placeholderTextColor={Neutral[400]}
                                    value={filters.minRooms?.toString() || ''}
                                    onChangeText={(text) => updateFilter('minRooms', text ? parseInt(text) : undefined)}
                                />
                            </View>
                            <View style={styles.rangeInput}>
                                <Text style={styles.label}>Max</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Rooms"
                                    keyboardType="number-pad"
                                    placeholderTextColor={Neutral[400]}
                                    value={filters.maxRooms?.toString() || ''}
                                    onChangeText={(text) => updateFilter('maxRooms', text ? parseInt(text) : undefined)}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Layout Type */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Layout Type</Text>
                        <View style={styles.optionsRow}>
                            {LAYOUT_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.optionButton, (filters.layoutTypes || []).includes(type) && styles.optionButtonActive]}
                                    onPress={() => toggleLayoutType(type)}
                                >
                                    <Text style={[(filters.layoutTypes || []).includes(type) && styles.optionButtonTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Pet Friendly */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pet Friendly</Text>
                        <View style={styles.optionsRow}>
                            <TouchableOpacity
                                style={[styles.optionButton, filters.petFriendly === true && styles.optionButtonActive]}
                                onPress={() => updateFilter('petFriendly', filters.petFriendly === true ? null : true)}
                            >
                                <Text style={[styles.optionButtonText, filters.petFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionButton, filters.petFriendly === false && styles.optionButtonActive]}
                                onPress={() => updateFilter('petFriendly', filters.petFriendly === false ? null : false)}
                            >
                                <Text style={[styles.optionButtonText, filters.petFriendly === false && styles.optionButtonTextActive]}>No</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionButton, filters.petFriendly === null && filters.petFriendly !== undefined && styles.optionButtonActive]}
                                onPress={() => updateFilter('petFriendly', undefined)}
                            >
                                <Text style={[styles.optionButtonText]}>Any</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Smoker Friendly */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Smoker Friendly</Text>
                        <View style={styles.optionsRow}>
                            <TouchableOpacity
                                style={[styles.optionButton, filters.smokerFriendly === true && styles.optionButtonActive]}
                                onPress={() => updateFilter('smokerFriendly', filters.smokerFriendly === true ? null : true)}
                            >
                                <Text style={[styles.optionButtonText, filters.smokerFriendly === true && styles.optionButtonTextActive]}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionButton, filters.smokerFriendly === false && styles.optionButtonActive]}
                                onPress={() => updateFilter('smokerFriendly', filters.smokerFriendly === false ? null : false)}
                            >
                                <Text style={[styles.optionButtonText, filters.smokerFriendly === false && styles.optionButtonTextActive]}>No</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionButton, filters.smokerFriendly === null && filters.smokerFriendly !== undefined && styles.optionButtonActive]}
                                onPress={() => updateFilter('smokerFriendly', undefined)}
                            >
                                <Text style={[styles.optionButtonText]}>Any</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Preferred Tenant Types */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferred Tenant Types</Text>
                        <View style={styles.tenantTypes}>
                            {TENANT_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.tenantTypeButton, (filters.preferredTenants || []).includes(type) && styles.tenantTypeButtonActive]}
                                    onPress={() => toggleTenantType(type)}
                                >
                                    <Text style={[(filters.preferredTenants || []).includes(type) && styles.tenantTypeTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Location & Radius */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Search Location & Radius</Text>
                        <View style={styles.locationPickerContainer}>
                            <LocationPicker
                                addressValue={addressValue}
                                onAddressChange={setAddressValue}
                                onLocationPicked={handleLocationPicked}
                                radius={filters.searchRadiusKm}
                            />
                        </View>
                        {(filters.searchLatitude != null && filters.searchLongitude != null) && (
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationLabel}>Center: {filters.searchLatitude?.toFixed(4)}, {filters.searchLongitude?.toFixed(4)}</Text>
                                <View style={styles.radiusSection}>
                                    <View style={styles.radiusLabelRow}>
                                        <Text style={styles.label}>Search Radius</Text>
                                        <Text style={styles.radiusValue}>{(filters.searchRadiusKm || 1).toFixed(1)} km</Text>
                                    </View>
                                    <View style={styles.sliderContainer}>
                                        <Text style={styles.sliderMin}>0.5</Text>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={0.5}
                                            maximumValue={50}
                                            step={0.5}
                                            value={filters.searchRadiusKm || 1}
                                            onValueChange={(value) => updateFilter('searchRadiusKm', value)}
                                            minimumTrackTintColor={Blue[600]}
                                            maximumTrackTintColor={Neutral[300]}
                                        />
                                        <Text style={styles.sliderMax}>50</Text>
                                    </View>
                                    <Text style={styles.radiusHint}>Range: 0.5 - 50 km</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.changeLocationBtn}
                                    onPress={() => {
                                        setAddressValue('');
                                        setFilters(prev => ({
                                            ...prev,
                                            searchLatitude: undefined,
                                            searchLongitude: undefined,
                                            searchRadiusKm: undefined,
                                        }));
                                    }}
                                >
                                    <Ionicons name="refresh-outline" size={16} color={Blue[600]} />
                                    <Text style={styles.changeLocationBtnText}>Change Location</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* Footer Buttons */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                    <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
                        <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </Modal>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[200],
    },
    headerTitle: {
        fontSize: Typography.xl,
        fontWeight: '600',
        color: Neutral[900],
    },
    closeButton: {
        padding: Spacing.sm,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.md,
        fontWeight: '600',
        color: Neutral[900],
        marginBottom: Spacing.sm,
    },
    label: {
        fontSize: Typography.sm,
        color: Neutral[600],
        marginBottom: Spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: Neutral[300],
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: Typography.base,
        color: Neutral[900],
        backgroundColor: Neutral[50],
    },
    rangeRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    rangeInput: {
        flex: 1,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },
    optionButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1.5,
        borderColor: Neutral[300],
        borderRadius: BorderRadius.lg,
        backgroundColor: Neutral[50],
    },
    optionButtonActive: {
        backgroundColor: Blue[600],
        borderColor: Blue[600],
    },
    optionButtonText: {
        fontSize: Typography.sm,
        color: Neutral[700],
        fontWeight: '500',
    },
    optionButtonTextActive: {
        color: 'white',
    },
    tenantTypes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    tenantTypeButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1.5,
        borderColor: Neutral[300],
        borderRadius: BorderRadius.lg,
        backgroundColor: Neutral[50],
    },
    tenantTypeButtonActive: {
        backgroundColor: Blue[600],
        borderColor: Blue[600],
    },
    tenantTypeText: {
        fontSize: Typography.sm,
        color: Neutral[700],
        fontWeight: '500',
    },
    tenantTypeTextActive: {
        color: 'white',
    },
    locationInfo: {
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Blue[50],
        borderRadius: BorderRadius.md,
    },
    locationLabel: {
        fontSize: Typography.sm,
        color: Blue[700],
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Neutral[200],
        backgroundColor: 'white',
    },
    clearButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderWidth: 1.5,
        borderColor: Neutral[300],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Neutral[50],
    },
    clearButtonText: {
        fontSize: Typography.base,
        fontWeight: '600',
        color: Neutral[700],
    },
    applyButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        backgroundColor: Blue[600],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonText: {
        fontSize: Typography.base,
        fontWeight: '600',
        color: 'white',
    },
    locationPickerContainer: {
        marginBottom: Spacing.md,
    },
    radiusSection: {
        marginTop: Spacing.md,
        gap: Spacing.md,
    },
    radiusLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    slider: {
        flex: 1,
        height: 40,
    },
    sliderMin: {
        fontSize: Typography.xs,
        color: Neutral[600],
        fontWeight: '500',
        minWidth: 28,
    },
    sliderMax: {
        fontSize: Typography.xs,
        color: Neutral[600],
        fontWeight: '500',
        minWidth: 28,
    },
    radiusValue: {
        fontSize: Typography.base,
        fontWeight: '700',
        color: Blue[600],
    },
    radiusHint: {
        fontSize: Typography.xs,
        color: Neutral[500],
        fontStyle: 'italic',
    },
    changeLocationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1.5,
        borderColor: Blue[600],
        borderRadius: BorderRadius.md,
        backgroundColor: Blue[50],
        marginTop: Spacing.sm,
    },
    changeLocationBtnText: {
        fontSize: Typography.sm,
        fontWeight: '600',
        color: Blue[600],
    },
    // Modal styles
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[200],
        backgroundColor: 'white',
    },
    modalTitle: {
        fontSize: Typography.lg,
        fontWeight: '700',
        color: Neutral[900],
    },
    closeButton: {
        padding: Spacing.sm,
    },
    modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Neutral[200],
        backgroundColor: 'white',
    },
    modalAddress: {
        fontSize: Typography.sm,
        color: Neutral[700],
        flex: 1,
    },
});

// --- PROPERTY MAP MODAL ---
const PropertyMapModal = ({ visible, onClose, latitude, longitude, address, searchRadius }: any) => {
    const insets = useSafeAreaInsets();
    
    // 1. Safety check: Ensure coordinates exist before rendering map
    if (!visible || !latitude || !longitude) return null;

    // 2. Parse numbers to ensure JS doesn't crash in WebView
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // 3. Radius Logic: Use the preference radius or default to 1km
    const radiusKm = searchRadius && searchRadius > 0 ? searchRadius : 1;
    const radiusMeters = radiusKm * 1000;

    const mapHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
          <style>
              body, html, #map { height: 100%; width: 100%; margin: 0; padding: 0; background-color: #f0f0f0; }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
              try {
                  // Initialize Map
                  var map = L.map('map').setView([${lat}, ${lng}], 14);

                  // Add Tile Layer
                  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                      maxZoom: 19,
                      attribution: '&copy; OpenStreetMap'
                  }).addTo(map);

                  // Add Center Marker
                  L.marker([${lat}, ${lng}]).addTo(map);

                  // Add Radius Circle (Dynamic)
                  L.circle([${lat}, ${lng}], {
                      color: '#EF4444',       
                      fillColor: '#EF4444', 
                      fillOpacity: 0.2,
                      weight: 1,
                      radius: ${radiusMeters}         
                  }).addTo(map);
                  
              } catch (e) {
                  // Catch errors to prevent white screen of death
                  alert('Map Error: ' + e.message);
              }
          </script>
      </body>
      </html>
    `;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 20 : 10 }]}>
                    <Text style={styles.modalTitle}>Location Preview</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={Neutral[900]} />
                    </TouchableOpacity>
                </View>
                
                <View style={{ flex: 1, backgroundColor: '#f0f0f0' }}>
                    {Platform.OS === 'web' ? (
                        <iframe srcDoc={mapHtml} style={{ width: '100%', height: '100%', border: 'none' }} title="map" />
                    ) : (
                        <WebView 
                            originWhitelist={['*']} 
                            source={{ 
                                html: mapHtml, 
                                // FIX: baseUrl is required for Android to load external scripts/images correctly
                                baseUrl: Platform.OS === 'android' ? 'file:///android_asset/' : '' 
                            }} 
                            style={{ flex: 1 }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            startInLoadingState={true}
                            renderLoading={() => <ActivityIndicator style={{position: 'absolute', top: '50%', left: '50%'}} color={Blue[500]} />}
                        />
                    )}
                </View>

                <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 10 }]}>
                    <Ionicons name="location" size={20} color={Blue[600]} />
                    <Text style={styles.modalAddress}>{address}</Text>
                </View>
            </View>
        </Modal>
    );
};

export { PropertyMapModal };
