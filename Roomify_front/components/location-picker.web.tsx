import React, { useState, useEffect, Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Text } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';
import { Neutral, Blue, BorderRadius, Spacing, Typography } from '@/constants/theme';

// Lazy load Leaflet to avoid SSR issues
const LeafletMap = React.lazy(() => import('./LeafletMap'));

interface LocationPickerProps {
    initialLocation?: { lat: number; lng: number };
    // 👇 NEW: Controlled props
    addressValue: string;
    onAddressChange: (text: string) => void;
    onLocationPicked: (location: { lat: number; lng: number; address?: string }) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
                                                                  initialLocation,
                                                                  addressValue,
                                                                  onAddressChange,
                                                                  onLocationPicked
                                                              }) => {
    const defaultLocation = { lat: 44.4268, lng: 26.1025 };

    const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | undefined>(initialLocation);
    const [isFetching, setIsFetching] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (initialLocation) {
            setPickedLocation(initialLocation);
        }
    }, [initialLocation]);

    // --- GEOCODING ---

    const searchAddressHandler = async () => {
        if (!addressValue.trim()) return;
        setIsFetching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressValue)}&addressdetails=1&limit=1`,
                { headers: { 'User-Agent': 'RoomifyApp/1.0' } }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);

                setPickedLocation({ lat, lng });

                // Update parent with coords AND formatted address
                onAddressChange(result.display_name);
                onLocationPicked({ lat, lng, address: result.display_name });
            } else {
                window.alert('Address not found. Please try a different query.');
            }
        } catch (error) {
            console.error("Search failed:", error);
            window.alert('Could not search for location.');
        } finally {
            setIsFetching(false);
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'User-Agent': 'RoomifyApp/1.0' } }
            );
            const data = await response.json();

            if (data && data.display_name) {
                // Simplify address for cleaner display
                return data.display_name.split(',').slice(0, 4).join(',');
            }
        } catch (err) {
            console.warn("Reverse geocoding failed", err);
        }
        return undefined;
    };

    // --- HANDLERS ---

    const handleMapClick = async (lat: number, lng: number) => {
        setPickedLocation({ lat, lng });

        // Reverse geocode to get the address of the clicked spot
        const address = await reverseGeocode(lat, lng);

        if (address) {
            onAddressChange(address); // Update the search input text
        }
        onLocationPicked({ lat, lng, address });
    };

    const getUserLocationHandler = async () => {
        setIsFetching(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                window.alert('Permission Denied: You need to grant location permissions.');
                setIsFetching(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const coords = {
                lat: location.coords.latitude,
                lng: location.coords.longitude
            };

            setPickedLocation(coords);
            const address = await reverseGeocode(coords.lat, coords.lng);

            if (address) onAddressChange(address);
            onLocationPicked({ ...coords, address });

        } catch (error) {
            console.error(error);
            window.alert('Could not fetch location.');
        } finally {
            setIsFetching(false);
        }
    };

    const mapCenter = pickedLocation || defaultLocation;

    return (
        <View style={styles.container}>
            {/* Search Bar - Controlled by Parent */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search city, street, or address..."
                    placeholderTextColor={Neutral[400]}
                    value={addressValue}
                    onChangeText={onAddressChange}
                    onSubmitEditing={searchAddressHandler}
                    returnKeyType="search"
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={searchAddressHandler}
                    disabled={isFetching}
                >
                    {isFetching ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Ionicons name="search" size={20} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Map Area */}
            <View style={styles.mapPreview}>
                {isClient && (
                    <Suspense fallback={<View style={styles.loader}><ActivityIndicator /></View>}>
                        <LeafletMap
                            // Force re-render when initial location changes (e.g. edit mode load)
                            key={initialLocation ? `map-${initialLocation.lat}-${initialLocation.lng}` : 'map-default'}
                            center={mapCenter}
                            onLocationPicked={handleMapClick}
                        />
                    </Suspense>
                )}
            </View>

            <View style={styles.actions}>
                <Button
                    title={isFetching ? "Locating..." : "Use My Current Location"}
                    variant="outline"
                    onPress={getUserLocationHandler}
                    disabled={isFetching}
                />
            </View>
            <Text style={styles.helperText}>
                Search or click on the map to pin the location.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: Spacing.md, width: '100%' },
    searchContainer: { flexDirection: 'row', marginBottom: Spacing.sm, gap: Spacing.xs },
    searchInput: { flex: 1, height: 44, borderWidth: 1, borderColor: Neutral[300], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, backgroundColor: '#FFFFFF', fontSize: 16, outlineStyle: 'none' },
    searchButton: { width: 44, height: 44, backgroundColor: Blue[600], borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    mapPreview: { width: '100%', height: 300, marginBottom: Spacing.sm, borderColor: Neutral[300], borderWidth: 1, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative', backgroundColor: Neutral[100] },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    actions: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
    helperText: { fontSize: Typography.size.xs, color: Neutral[500], textAlign: 'center', marginTop: Spacing.xs }
});