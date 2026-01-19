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
    Modal,
    Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { SwipeButtons, EmptyState, ImageGalleryModal } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Property, MatchResponse } from '@/constants/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH - (Spacing.md * 2);
const CARD_HEIGHT = SCREEN_HEIGHT * 0.78;

// --- HELPER: Formatting ---
const formatEnumString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// --- HELPER: Fix Image URLs ---
const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const BASE_URL = `http://${MY_IP}:8080`;
    return path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
};

// --- MATCH OVERLAY COMPONENT ---
const MatchOverlay = ({ visible, userImage, propertyImage, propertyTitle, onClose, onChat }: any) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const slideLeft = useRef(new Animated.Value(-300)).current;
    const slideRight = useRef(new Animated.Value(300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            slideLeft.setValue(-300);
            slideRight.setValue(300);
            fadeAnim.setValue(0);

            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
                Animated.parallel([
                    Animated.spring(slideLeft, { toValue: 0, friction: 6, useNativeDriver: true }),
                    Animated.spring(slideRight, { toValue: 0, friction: 6, useNativeDriver: true }),
                ]),
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true })
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalBackground} />

                <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate: '-5deg' }] }}>
                    <Text style={styles.matchTitle}>It's a Match!</Text>
                </Animated.View>

                <Text style={styles.matchSubtitle}>The landlord of {propertyTitle} likes you too.</Text>

                <View style={styles.avatarsRow}>
                    <Animated.View style={{ transform: [{ translateX: slideLeft }] }}>
                        <Image source={{ uri: userImage || 'https://via.placeholder.com/150' }} style={[styles.matchAvatar, styles.leftAvatar]} />
                    </Animated.View>
                    <Animated.View style={{ transform: [{ translateX: slideRight }] }}>
                        <Image source={{ uri: propertyImage || 'https://via.placeholder.com/150' }} style={[styles.matchAvatar, styles.rightAvatar]} />
                    </Animated.View>
                    <View style={styles.heartCircle}>
                        <Ionicons name="heart" size={32} color={Blue[600]} />
                    </View>
                </View>

                <Animated.View style={[styles.matchButtons, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={styles.chatButton} onPress={onChat}>
                        <Ionicons name="chatbubbles" size={20} color="#FFF" />
                        <Text style={styles.chatButtonText}>Send a Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.keepSwipingButton} onPress={onClose}>
                        <Text style={styles.keepSwipingText}>Keep Swiping</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- PROPERTY CARD ---
const PropertyCard = memo(({ property, isTopCard, onOpenGallery, onOpenMap }: { property: any, isTopCard: boolean, onOpenGallery: () => void, onOpenMap: () => void }) => {
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
                            <Text style={styles.location} numberOfLines={1}>{property.address}</Text>
                        </View>
                        <TouchableOpacity style={styles.mapPill} onPress={onOpenMap} disabled={!isTopCard}>
                            <Ionicons name="map-outline" size={14} color={Blue[600]} />
                            <Text style={styles.mapPillText}>See on Map</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.specsGrid}>
                        <View style={styles.specItem}><Ionicons name="grid-outline" size={18} color={Blue[600]} /><Text style={styles.specText}>{property.numberOfRooms} Rooms</Text></View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.specItem}><Ionicons name="water-outline" size={18} color={Blue[600]} /><Text style={styles.specText}>{property.hasExtraBathroom ? 2 : 1} Bath</Text></View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.specItem}><Ionicons name="resize-outline" size={18} color={Blue[600]} /><Text style={styles.specText}>{property.surface} m²</Text></View>
                        {property.layoutType && (
                            <>
                                <View style={styles.verticalDivider} />
                                <View style={styles.specItem}><Ionicons name="home-outline" size={18} color={Blue[600]} /><Text style={styles.specText} numberOfLines={1}>{formatEnumString(property.layoutType)}</Text></View>
                            </>
                        )}
                    </View>

                    <View style={styles.descriptionContainer}>
                        <Text style={styles.sectionTitle}>About this property</Text>
                        <Text style={styles.description}>{property.description || "No description available."}</Text>
                    </View>

                    {property.preferredTenants && property.preferredTenants.length > 0 && (
                        <View style={styles.sectionRow}>
                            <View style={styles.sectionIcon}><Ionicons name="people" size={16} color={Neutral[500]} /></View>
                            <View style={styles.inlineTagsContainer}>
                                <Text style={styles.sectionLabelInline}>Preferred:</Text>
                                {property.preferredTenants.map((item: string, i: number) => (
                                    <View key={i} style={styles.tenantTag}><Text style={styles.tenantTagText}>{formatEnumString(item)}</Text></View>
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

// --- MAP MODAL ---
const PropertyMapModal = ({ visible, onClose, latitude, longitude, address }: any) => {
    const insets = useSafeAreaInsets();
    if (!visible) return null;
    const mapHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style> body, html, #map { height: 100%; width: 100%; margin: 0; } </style></head><body><div id="map"></div><script>var map = L.map('map').setView([${latitude}, ${longitude}], 15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap'}).addTo(map);L.marker([${latitude}, ${longitude}]).addTo(map).bindPopup("${address}").openPopup();</script></body></html>`;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 20 : 10 }]}>
                    <Text style={styles.modalTitle}>Location</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={24} color={Neutral[900]} /></TouchableOpacity>
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

export default function TenantBrowseScreen() {
    const insets = useSafeAreaInsets();
    const { getAccessToken, logout, user } = useAuth();
    const router = useRouter();

    const [properties, setProperties] = useState<Property[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const [isGalleryVisible, setIsGalleryVisible] = useState(false);
    const [isMapVisible, setIsMapVisible] = useState(false);

    // --- ANIMATION STATE ---
    const [position, setPosition] = useState(new Animated.ValueXY());
    const positionRef = useRef(position);

    // --- MATCH STATE ---
    const [matchModalVisible, setMatchModalVisible] = useState(false);
    const [matchedProperty, setMatchedProperty] = useState<any>(null);
    const [currentMatchId, setCurrentMatchId] = useState<number | null>(null);

    useEffect(() => { positionRef.current = position; }, [position]);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    const fetchFeed = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/properties/feed`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 409) {
                const errorText = await response.text();
                Alert.alert("Login Mismatch", errorText, [{ text: "Log Out & Switch", onPress: async () => { await logout(); router.replace('/login'); } }]);
                setIsLoading(false);
                return;
            }

            if (response.ok) {
                const data = await response.json();
                const mapped = data.map((p: any) => ({
                    ...p,
                    images: p.images?.map((img: any) => {
                        const url = img.url;
                        if (!url.startsWith('http')) return `http://${MY_IP}:8080${url}`;
                        return url.replace('localhost', MY_IP).replace('127.0.0.1', MY_IP);
                    }) || []
                }));
                setProperties(mapped);
                setCurrentIndex(0);
            }
        } catch (error) { console.error("Feed Error:", error); }
        finally { setIsLoading(false); }
    }, [getAccessToken, MY_IP, logout, router]);

    useEffect(() => { fetchFeed(); }, [fetchFeed]);

    const swipeCard = useCallback((direction: 'left' | 'right') => {
        const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
        // 1. Capture the property BEFORE incrementing state
        const currentProp = properties[currentIndex];

        Animated.spring(positionRef.current, {
            toValue: { x, y: -50 },
            useNativeDriver: false,
            speed: 100
        }).start(async () => {
            setCurrentIndex(prev => prev + 1);
            setPosition(new Animated.ValueXY());

            if (!currentProp) return;

            try {
                const token = await getAccessToken();
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                if (direction === 'right') {
                    // --- LIKE (Swipe Right) ---
                    const response = await fetch(`http://${MY_IP}:8080/api/matches/tenant/swipe/${currentProp.id}`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({})
                    });

                    if (response.ok) {
                        const matchData: MatchResponse = await response.json();
                        // --- CHECK MATCH ---
                        if (matchData.status === 'MATCHED') {
                            setMatchedProperty(currentProp);
                            setCurrentMatchId(matchData.id);
                            setMatchModalVisible(true);
                        }
                    }
                } else {
                    // --- PASS / DISLIKE (Swipe Left) ---
                    // This calls the backend to update score negatively
                    console.log("Passing property:", currentProp.id);
                    await fetch(`http://${MY_IP}:8080/api/matches/tenant/pass/${currentProp.id}`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({})
                    });
                }
            } catch (error) { console.error("Swipe API Error", error); }
        });
    }, [properties, currentIndex, getAccessToken, MY_IP]);

    const resetPosition = useCallback(() => {
        Animated.spring(positionRef.current, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 10,
            onPanResponderMove: (_, gesture) => { positionRef.current.setValue({ x: gesture.dx, y: gesture.dy }); },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) swipeCard('right');
                else if (gesture.dx < -SWIPE_THRESHOLD) swipeCard('left');
                else resetPosition();
            },
        })
    ).current;

    const handleInterested = () => swipeCard('right');
    const handleNotInterested = () => swipeCard('left');

    const currentProperty = properties[currentIndex];
    const nextProperty = properties[currentIndex + 1];

    const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp' });
    const nextCardScale = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: [1, 0.95, 1], extrapolate: 'clamp' });
    const likeOpacity = position.x.interpolate({ inputRange: [0, SCREEN_WIDTH/4], outputRange: [0, 1] });
    const nopeOpacity = position.x.interpolate({ inputRange: [-SCREEN_WIDTH/4, 0], outputRange: [1, 0] });

    if (isLoading && properties.length === 0) return <ActivityIndicator style={styles.centered} size="large" color={Blue[500]} />;

    // --- RENDER LOGIC FIXED ---
    // Instead of early return, we render the Structure and conditionally show cards or EmptyState
    // This ensures MatchOverlay is always mounted and can trigger even if the feed becomes empty.

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {!currentProperty ? (
                // EMPTY STATE
                <EmptyState
                    icon="home-outline"
                    title="No more properties"
                    message="Check back later for new listings!"
                    actionLabel="Refresh"
                    onAction={() => { setProperties([]); fetchFeed(); }}
                />
            ) : (
                // CARDS & BUTTONS
                <>
                    <View style={styles.cardContainer}>
                        {nextProperty && (
                            <Animated.View key={nextProperty.id} style={[styles.card, styles.nextCard, { transform: [{ scale: nextCardScale }], opacity: 1 }]}>
                                <PropertyCard property={nextProperty} isTopCard={false} onOpenGallery={() => {}} onOpenMap={() => {}} />
                            </Animated.View>
                        )}
                        <Animated.View
                            key={currentProperty.id}
                            style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
                            {...panResponder.panHandlers}
                        >
                            <PropertyCard
                                property={currentProperty}
                                isTopCard={true}
                                onOpenGallery={() => setIsGalleryVisible(true)}
                                onOpenMap={() => setIsMapVisible(true)}
                            />
                            <Animated.View style={[styles.indicator, styles.interestedIndicator, { opacity: likeOpacity }]}>
                                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                            </Animated.View>
                            <Animated.View style={[styles.indicator, styles.notInterestedIndicator, { opacity: nopeOpacity }]}>
                                <Ionicons name="close-circle" size={64} color="#EF4444" />
                            </Animated.View>
                        </Animated.View>
                    </View>
                    <SwipeButtons onInterested={handleInterested} onNotInterested={handleNotInterested} />
                </>
            )}

            {/* MODALS - ALWAYS AVAILABLE */}
            {/* Note: ImageGallery uses matchedProperty or currentProperty safely */}
            <ImageGalleryModal
                images={currentProperty?.images || matchedProperty?.images || []}
                visible={isGalleryVisible}
                onClose={() => setIsGalleryVisible(false)}
            />

            <PropertyMapModal
                visible={isMapVisible}
                onClose={() => setIsMapVisible(false)}
                latitude={currentProperty?.latitude || 0}
                longitude={currentProperty?.longitude || 0}
                address={currentProperty?.address || ''}
            />

            {/* MATCH OVERLAY */}
            <MatchOverlay
                visible={matchModalVisible}
                userImage={getImageUrl(user?.picture)}
                propertyImage={matchedProperty?.images?.[0]}
                propertyTitle={matchedProperty?.title}
                onClose={() => setMatchModalVisible(false)}
                onChat={() => {
                    setMatchModalVisible(false);
                    if (currentMatchId) {
                        router.push({
                            pathname: '/chat-room',
                            params: {
                                chatId: currentMatchId,
                                title: matchedProperty?.title || 'Landlord'
                            }
                        });
                    } else {
                        router.push('/(tenant)/matches');
                    }
                }}
            />
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
    indicator: { position: 'absolute', top: '35%', alignSelf: 'center', zIndex: 10, shadowColor: "#000", shadowOpacity: 0.2, elevation: 5 },
    interestedIndicator: { left: 40 },
    notInterestedIndicator: { right: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Neutral[200] },
    modalTitle: { fontSize: Typography.size.lg, fontWeight: 'bold' },
    closeButton: { padding: 4 },
    modalFooter: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: '#fff', gap: 8 },
    modalAddress: { fontSize: Typography.size.base, color: Neutral[800], flex: 1 },

    // --- MATCH MODAL STYLES ---
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
    matchTitle: { fontSize: 48, fontWeight: 'bold', color: '#4ADE80', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10, fontFamily: 'System' },
    matchSubtitle: { fontSize: 16, color: '#FFF', marginBottom: 40, opacity: 0.9 },
    avatarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 60, position: 'relative' },
    matchAvatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#FFF' },
    leftAvatar: { marginRight: -20 },
    rightAvatar: { marginLeft: -20 },
    heartCircle: { position: 'absolute', backgroundColor: '#FFF', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    matchButtons: { width: '80%', gap: 16 },
    chatButton: { backgroundColor: Blue[600], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 30, gap: 10 },
    chatButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    keepSwipingButton: { backgroundColor: 'transparent', paddingVertical: 16, alignItems: 'center' },
    keepSwipingText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});