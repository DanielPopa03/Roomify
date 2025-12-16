import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- FIX: Use CDN images to guarantee the marker appears ---
// Local imports often fail in Expo Web/Metro bundlers.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapProps {
    center: { lat: number; lng: number };
    onLocationPicked: (lat: number, lng: number) => void;
}

const MapClickHandler = ({ onLocationPicked }: { onLocationPicked: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onLocationPicked(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

const MapRecenter = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMapEvents({});
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

const LeafletMap: React.FC<LeafletMapProps> = ({ center, onLocationPicked }) => {
    return (
        <View style={styles.mapContainer}>
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={13}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onLocationPicked={onLocationPicked} />
                <Marker position={[center.lat, center.lng]} />
                <MapRecenter lat={center.lat} lng={center.lng} />
            </MapContainer>
        </View>
    );
};

const styles = StyleSheet.create({
    mapContainer: {
        height: '100%',
        width: '100%',
    }
});

export default LeafletMap;