import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Dimensions,
    Animated,
    PanResponder,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Platform,
    Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { SwipeButtons, EmptyState, ImageGalleryModal } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useProperties, useInteractions } from '@/hooks/useApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH - (Spacing.md * 2);
const CARD_HEIGHT = SCREEN_HEIGHT * 0.78;

// --- 1. MEMOIZED CARD COMPONENT ---
const PropertyCard = memo(({ property, isTopCard, onOpenGallery, onOpenMap }: any) => {
    return (
        <View style={styles.cardInner}>
            <TouchableOpacity
                style={styles.imageContainer}
                onPress={onOpenGallery}
                activeOpacity={isTopCard ? 0.95 : 1}
                disabled={!isTopCard}
            >
                <Image source={{ uri: property.images?.[0] }} style={styles.cardImage} resizeMode="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.2)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']} style={styles.imageGradient} />
                <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>€{property.price}</Text>
                    <Text style={styles.priceBadgeUnit}>/mo</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.contentWrapper}>
                <ScrollView
                    style={styles.scrollContent}
                    showsVerticalScrollIndicator={isTopCard}
                    scrollEnabled={isTopCard}
                    nestedScrollEnabled={true}
                >
                    <View style={styles.headerSection}>
                        <Text style={styles.title} numberOfLines={2}>{property.title}</Text>
                        <View style={styles.addressRow}>
                            <Ionicons name="location" size={16} color={Neutral[500]} />
                            <Text style={styles.location} numberOfLines={1}>{property.location}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.mapPill}
                            onPress={onOpenMap}
                            disabled={!isTopCard}
                        >
                            <Ionicons name="map-outline" size={14} color={Blue[600]} />
                            <Text style={styles.mapPillText}>See on Map</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.specsGrid}>
                        <View style={styles.specItem}>
                            <Ionicons name="grid-outline" size={18} color={Blue[600]} />
                            <Text style={styles.specText}>{property.rooms} Rooms</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.specItem}>
                            <Ionicons name="water-outline" size={18} color={Blue[600]} />
                            <Text style={styles.specText}>{property.bathrooms} Bath</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.specItem}>
                            <Ionicons name="resize-outline" size={18} color={Blue[600]} />
                            <Text style={styles.specText}>{property.area} m²</Text>
                        </View>
                        {property.layoutType && (
                            <>
                                <View style={styles.verticalDivider} />
                                <View style={styles.specItem}>
                                    <Ionicons name="home-outline" size={18} color={Blue[600]} />
                                    <Text style={styles.specText} numberOfLines={1}>{property.layoutType}</Text>
                                </View>
                            </>
                        )}
                    </View>

                    <View style={styles.descriptionContainer}>
                        <Text style={styles.sectionTitle}>About this property</Text>
                        <Text style={styles.description}>
                            {property.description}
                        </Text>
                    </View>

                    {property.tenantAmenities.length > 0 && (
                        <View style={styles.sectionRow}>
                            <View style={styles.sectionIcon}>
                                <Ionicons name="people" size={16} color={Neutral[500]} />
                            </View>
                            <View style={styles.inlineTagsContainer}>
                                <Text style={styles.sectionLabelInline}>Preferred:</Text>
                                {property.tenantAmenities.map((item: string, i: number) => (
                                    <View key={i} style={styles.tenantTag}>
                                        <Text style={styles.tenantTagText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {property.generalAmenities.length > 0 && (
                        <View style={styles.sectionRow}>
                            <View style={styles.sectionIcon}>
                                <Ionicons name="star" size={16} color={Neutral[500]} />
                            </View>
                            <View style={styles.inlineTagsContainer}>
                                {property.generalAmenities.map((item: string, i: number) => (
                                    <View key={i} style={styles.amenityTag}>
                                        <Text style={styles.amenityText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                    <View style={{ height: 20 }} />
                </ScrollView>
            </View>
        </View>
    );
});

// --- HELPER: Map Modal ---
const PropertyMapModal = ({ visible, onClose, latitude, longitude, address }: any) => {
    const insets = useSafeAreaInsets();
    if (!visible) return null;
    const mapHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style> body, html, #map { height: 100%; width: 100%; margin: 0; } </style></head><body><div id="map"></div><script>var map = L.map('map').setView([${latitude}, ${longitude}], 15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap'}).addTo(map);L.marker([${latitude}, ${longitude}]).addTo(map).bindPopup("${address}").openPopup();</script></body></html>`;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 20 : 10 }]}>
                    <Text style={styles.modalTitle}>Location</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={Neutral[900]} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                    {Platform.OS === 'web' ? (
                        <iframe srcDoc={mapHtml} style={{ width: '100%', height: '100%', border: 'none' }} title="map" />
                    ) : (
                        <WebView originWhitelist={['*']} source={{ html: mapHtml }} style={{ flex: 1 }} />
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

const formatEnumString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function BrowseScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { data: apiProperties, isLoading, refetch } = useProperties();
    const { expressInterest, pass } = useInteractions();

    const [properties, setProperties] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isGalleryVisible, setIsGalleryVisible] = useState(false);
    const [isMapVisible, setIsMapVisible] = useState(false);

    // FIX 1: Use State for Position so we can replace it (Flicker Fix)
    const [position, setPosition] = useState(new Animated.ValueXY());

    // FIX 2: Use Ref to track the *current* position object for PanResponder (Swipe Fix)
    const positionRef = useRef(position);

    // Keep ref in sync with state
    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    useEffect(() => {
        if (apiProperties && apiProperties.length > 0) {
            const mappedProperties = apiProperties.map(p => {
                const generalAmenities = [];
                const tenantAmenities = [];
                if (p.petFriendly === true) generalAmenities.push('Pet Friendly');
                if (p.petFriendly === false) generalAmenities.push('No Pets');
                if (p.smokerFriendly === true) generalAmenities.push('Smoking Allowed');
                if (p.preferredTenants && Array.isArray(p.preferredTenants)) {
                    p.preferredTenants.forEach((t: string) => tenantAmenities.push(formatEnumString(t)));
                }
                return {
                    id: p.id.toString(),
                    images: p.images?.length > 0
                        ? p.images.map((img: any) => img.url.replace('localhost', MY_IP).replace('127.0.0.1', MY_IP))
                        : ['https://images.unsplash.com/photo-1568605114967-8130f3a36994'],
                    title: p.title,
                    price: p.price,
                    location: p.address,
                    description: p.description || 'No description available',
                    rooms: p.numberOfRooms,
                    bathrooms: p.hasExtraBathroom ? 2 : 1,
                    area: p.surface,
                    layoutType: p.layoutType ? formatEnumString(p.layoutType) : null,
                    generalAmenities: generalAmenities,
                    tenantAmenities: tenantAmenities,
                    landlord: { name: 'Landlord', avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${p.ownerId}` },
                    latitude: p.latitude || 44.4268,
                    longitude: p.longitude || 26.1025
                };
            });
            if (properties.length === 0) {
                setProperties(mappedProperties);
                setCurrentIndex(0);
            }
        }
    }, [apiProperties, MY_IP]);

    const currentProperty = properties[currentIndex];
    const nextProperty = properties[currentIndex + 1];

    const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp' });
    const nextCardScale = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: [1, 0.95, 1], extrapolate: 'clamp' });
    const nextCardOpacity = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: [1, 0.6, 1], extrapolate: 'clamp' });

    const cardStyle = { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] };
    const nextCardStyle = { transform: [{ scale: nextCardScale }], opacity: nextCardOpacity };

    // --- LOGIC ---
    const swipeCard = useCallback((direction: 'left' | 'right') => {
        const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;

        // Use positionRef.current to ensure we animate the ACTIVE value
        Animated.spring(positionRef.current, {
            toValue: { x, y: -50 },
            useNativeDriver: false,
            speed: 100
        }).start(() => {
            setCurrentIndex(prev => prev + 1);

            // Replaces the value with a fresh one to prevent flicker
            setPosition(new Animated.ValueXY());

            if (currentProperty) {
                if (direction === 'right') expressInterest(currentProperty.id);
                else pass(currentProperty.id);
            }
        });
    }, [currentProperty, expressInterest, pass]);

    const resetPosition = useCallback(() => {
        Animated.spring(positionRef.current, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (_, gesture) => {
                // Use Ref to always drive the current state object
                positionRef.current.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) swipeCard('right');
                else if (gesture.dx < -SWIPE_THRESHOLD) swipeCard('left');
                else resetPosition();
            },
        })
    ).current;

    const handleInterested = () => swipeCard('right');
    const handleNotInterested = () => swipeCard('left');

    if (isLoading && properties.length === 0) return <ActivityIndicator style={styles.centered} size="large" color={Blue[500]} />;

    if (!currentProperty) {
        return <EmptyState icon="home-outline" title="No more properties" actionLabel="Refresh" onAction={() => { setProperties([]); refetch(); }} />;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.cardContainer}>

                {/* BACKGROUND CARD */}
                {nextProperty && (
                    <Animated.View
                        key={nextProperty.id}
                        style={[styles.card, styles.nextCard, nextCardStyle]}
                    >
                        <PropertyCard property={nextProperty} isTopCard={false} />
                    </Animated.View>
                )}

                {/* FOREGROUND CARD */}
                <Animated.View
                    key={currentProperty.id}
                    style={[styles.card, cardStyle]}
                    {...panResponder.panHandlers}
                >
                    <PropertyCard
                        property={currentProperty}
                        isTopCard={true}
                        onOpenGallery={() => setIsGalleryVisible(true)}
                        onOpenMap={() => setIsMapVisible(true)}
                    />

                    <Animated.View style={[styles.indicator, styles.interestedIndicator, { opacity: position.x.interpolate({ inputRange: [0, SCREEN_WIDTH/4], outputRange: [0, 1] }) }]}>
                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                    </Animated.View>
                    <Animated.View style={[styles.indicator, styles.notInterestedIndicator, { opacity: position.x.interpolate({ inputRange: [-SCREEN_WIDTH/4, 0], outputRange: [1, 0] }) }]}>
                        <Ionicons name="close-circle" size={28} color="#EF4444" />
                    </Animated.View>
                </Animated.View>

            </View>
            <SwipeButtons onInterested={handleInterested} onNotInterested={handleNotInterested} />

            {currentProperty && (
                <>
                    <ImageGalleryModal images={currentProperty.images} visible={isGalleryVisible} onClose={() => setIsGalleryVisible(false)} />
                    <PropertyMapModal visible={isMapVisible} onClose={() => setIsMapVisible(false)} latitude={currentProperty.latitude} longitude={currentProperty.longitude} address={currentProperty.location} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cardContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: BorderRadius['2xl'],
        ...Shadows.xl,
        position: 'absolute',
    },
    nextCard: { zIndex: 0 },
    cardInner: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: BorderRadius['2xl'], overflow: 'hidden' },
    imageContainer: { height: '40%', position: 'relative' },
    cardImage: { width: '100%', height: '100%' },
    imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%' },
    priceBadge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: Blue[600], paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'baseline' },
    priceBadgeText: { fontSize: Typography.size.xl, fontWeight: 'bold', color: '#FFFFFF' },
    priceBadgeUnit: { fontSize: Typography.size.xs, color: 'rgba(255,255,255,0.9)', marginLeft: 2 },
    contentWrapper: { flex: 1 },
    scrollContent: { padding: Spacing.md },
    headerSection: { marginBottom: Spacing.sm },
    title: { fontSize: Typography.size.lg, fontWeight: 'bold', color: Neutral[900], marginBottom: 4 },
    addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    location: { fontSize: Typography.size.sm, color: Neutral[500], marginLeft: 4, flex: 1 },
    mapPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: Blue[50], paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
    mapPillText: { fontSize: Typography.size.xs, fontWeight: '600', color: Blue[600] },
    specsGrid: { flexDirection: 'row', alignItems: 'center', backgroundColor: Neutral[50], borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md, justifyContent: 'space-between' },
    specItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    specText: { fontSize: Typography.size.xs, fontWeight: '600', color: Neutral[800] },
    verticalDivider: { width: 1, height: 16, backgroundColor: Neutral[200] },
    descriptionContainer: { marginBottom: Spacing.md },
    sectionTitle: { fontSize: Typography.size.xs, fontWeight: 'bold', color: Neutral[400], textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
    description: { fontSize: Typography.size.sm, color: Neutral[800], lineHeight: 22 },
    sectionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    sectionIcon: { width: 24, marginTop: 8 },
    inlineTagsContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    sectionLabelInline: { fontSize: Typography.size.xs, color: Neutral[500], marginRight: 4 },
    tenantTag: { backgroundColor: Blue[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: Blue[100] },
    tenantTagText: { fontSize: Typography.size.xs, color: Blue[700], fontWeight: '600' },
    amenityTag: { backgroundColor: Neutral[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    amenityText: { fontSize: Typography.size.xs, color: Neutral[600] },
    indicator: { position: 'absolute', top: 50, padding: 10, borderRadius: 100, backgroundColor: 'white', shadowColor: "#000", shadowOpacity: 0.1, elevation: 4 },
    interestedIndicator: { right: 20 },
    notInterestedIndicator: { left: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Neutral[200] },
    modalTitle: { fontSize: Typography.size.lg, fontWeight: 'bold' },
    closeButton: { padding: 4 },
    modalFooter: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: '#fff', gap: 8 },
    modalAddress: { fontSize: Typography.size.base, color: Neutral[800], flex: 1 },
});