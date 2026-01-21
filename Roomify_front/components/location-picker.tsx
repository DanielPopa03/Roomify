import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';
// Make sure to import your button correctly based on your file structure
// import { Button } from './ui/Button'; 
import { Blue, BorderRadius, Neutral, Spacing, Typography } from '@/constants/theme';

// Mock Button for standalone usage if you don't have the import handy
const Button = ({ title, onPress, disabled, variant }: any) => (
    <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled}
        style={{
            padding: 12, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: Blue[600],
            alignItems: 'center',
            opacity: disabled ? 0.6 : 1
        }}>
        <Text style={{ color: Blue[600], fontWeight: '600' }}>{title}</Text>
    </TouchableOpacity>
);

interface LocationPickerProps {
    initialLocation?: { lat: number; lng: number };
    addressValue: string;
    onAddressChange: (text: string) => void;
    onLocationPicked: (location: { lat: number; lng: number; address?: string }) => void;
    radius?: number; // In Kilometers
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    initialLocation,
    addressValue,
    onAddressChange,
    onLocationPicked,
    radius = 0
}) => {
    const DEFAULT_LAT = 44.4268;
    const DEFAULT_LNG = 26.1025;

    const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | undefined>(initialLocation);
    const [isFetching, setIsFetching] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const webViewRef = useRef<WebView>(null);

    // Initial values for the HTML generation
    const startLat = initialLocation ? initialLocation.lat : DEFAULT_LAT;
    const startLng = initialLocation ? initialLocation.lng : DEFAULT_LNG;

    // --- FIX: Update Map when Radius or Picked Location Changes ---
    useEffect(() => {
        if (isMapReady && pickedLocation) {
            const lat = pickedLocation.lat;
            const lng = pickedLocation.lng;
            // Convert km to meters, handle potential undefined
            const radiusMeters = (radius || 0) * 1000;
            console.log("mama ta");
            // Inject JS to update Leaflet view
            setTimeout(() => {
                webViewRef.current?.injectJavaScript(`
                if (typeof updateView === 'function') {
                    updateView(${lat}, ${lng}, ${radiusMeters});
                }
                true;
                 `);
            }, 300);
            
        }
    }, [isMapReady, pickedLocation, radius]); // <--- Added radius and pickedLocation here

    const mapHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map
          var map = L.map('map', { zoomControl: false }).setView([${startLat}, ${startLng}], 15);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          var marker = L.marker([${startLat}, ${startLng}]).addTo(map);
          var radiusCircle = null;

          // Initial render logic
          var startRadius = ${(radius || 0) * 1000};
          if (startRadius > 0) {
             radiusCircle = L.circle([${startLat}, ${startLng}], {
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.2,
                weight: 1,
                radius: startRadius
             }).addTo(map);
          }

          // Handle map taps
          map.on('click', function(e) {
            // Send coordinates back to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }));
          });

          // Function called by React Native injectJavaScript
          function updateView(lat, lng, radiusMeters) {
            var newLatLng = new L.LatLng(lat, lng);
            
            // Move marker and map
            marker.setLatLng(newLatLng);
            map.setView(newLatLng); // Optional: Keep map centered on pin? Remove if annoying.

            // Handle Circle
            if (radiusMeters > 0) {
                if (radiusCircle) {
                    // Update existing circle
                    radiusCircle.setLatLng(newLatLng);
                    radiusCircle.setRadius(radiusMeters);
                } else {
                    // Create new circle
                    radiusCircle = L.circle(newLatLng, {
                        color: '#EF4444',
                        fillColor: '#EF4444',
                        fillOpacity: 0.2,
                        weight: 1,
                        radius: radiusMeters
                    }).addTo(map);
                }
            } else {
                // Remove circle if radius is 0
                if (radiusCircle) {
                    map.removeLayer(radiusCircle);
                    radiusCircle = null;
                }
            }
          }
        </script>
      </body>
      </html>
    `;

    const searchAddressOSM = async (query: string) => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`;
            const response = await fetch(url, { headers: { 'User-Agent': 'RoomifyApp/1.0' } });
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    address: data[0].display_name
                };
            }
            return null;
        } catch (error) {
            console.error("OSM Search Error:", error);
            return null;
        }
    };

    const reverseGeocodeOSM = async (lat: number, lng: number) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
            const response = await fetch(url, { headers: { 'User-Agent': 'RoomifyApp/1.0' } });
            const data = await response.json();
            return data?.display_name;
        } catch (error) {
            return null;
        }
    };

    const updateLocation = async (lat: number, lng: number, shouldReverseGeocode: boolean = true) => {
        setPickedLocation({ lat, lng });
        
        let address = undefined;
        if (shouldReverseGeocode) {
            const result = await reverseGeocodeOSM(lat, lng);
            if (result) {
                address = result;
                onAddressChange(result); 
            }
        }

        onLocationPicked({ lat, lng, address });
    };

    const searchAddressHandler = async () => {
        if (!addressValue.trim()) return;
        setIsFetching(true);
        Keyboard.dismiss();

        const result = await searchAddressOSM(addressValue);
        if (result) {
            onAddressChange(result.address);
            updateLocation(result.lat, result.lng, false);
            onLocationPicked({ lat: result.lat, lng: result.lng, address: result.address });
        } else {
            Alert.alert('Not Found', 'Address not found on OpenStreetMap.');
        }
        setIsFetching(false);
    };

    const getUserLocationHandler = async () => {
        setIsFetching(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission required.');
                setIsFetching(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            updateLocation(loc.coords.latitude, loc.coords.longitude, true);
        } catch (error) {
            Alert.alert('Error', 'Could not fetch location.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.lat && data.lng) {
                updateLocation(data.lat, data.lng, true);
            }
        } catch (e) {
            console.error("Error parsing map message", e);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search city, street..."
                    placeholderTextColor={Neutral[400]}
                    value={addressValue}
                    onChangeText={onAddressChange}
                    onSubmitEditing={searchAddressHandler}
                    returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchButton} onPress={searchAddressHandler} disabled={isFetching}>
                    {isFetching ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="search" size={20} color="#FFF" />}
                </TouchableOpacity>
            </View>

            <View style={styles.mapPreview}>
                <WebView
                    ref={webViewRef}
                    originWhitelist={['*']}
                    source={{ 
                        html: mapHtml,
                        baseUrl: Platform.OS === 'android' ? 'file:///android_asset/' : '' 
                    }}
                    onMessage={handleWebViewMessage}
                    onLoadEnd={() => setIsMapReady(true)}
                    style={styles.map}
                    scrollEnabled={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                />
            </View>

            <View style={styles.actions}>
                <Button
                    title={isFetching ? "Locating..." : "Use My Current Location"}
                    variant="outline"
                    onPress={getUserLocationHandler}
                    disabled={isFetching}
                />
            </View>
            <Text style={styles.helperText}>Search or tap map to pin location.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: Spacing.md },
    searchContainer: { flexDirection: 'row', marginBottom: Spacing.sm, gap: Spacing.xs },
    searchInput: { flex: 1, height: 44, borderWidth: 1, borderColor: Neutral[300], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, backgroundColor: '#FFFFFF', fontSize: 16, color: Neutral[900] },
    searchButton: { width: 44, height: 44, backgroundColor: Blue[600], borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    mapPreview: { width: '100%', height: 250, marginBottom: Spacing.sm, borderColor: Neutral[300], borderWidth: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
    map: { width: '100%', height: '100%', opacity: 0.99 },
    actions: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
    helperText: { fontSize: Typography.size.xs, color: Neutral[500], textAlign: 'center', marginTop: Spacing.xs }
});