import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
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
    Modal,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';

import { SwipeButtons, EmptyState, ImageGalleryModal } from '@/components/ui';
import { Blue, Neutral, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMyListings } from '@/hooks/useApi';
// 1. IMPORT REPORT MODAL
import ReportModal from '@/components/report-modal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH - (Spacing.md * 2);
const CARD_HEIGHT = SCREEN_HEIGHT * 0.72;

// --- HELPER: Formatting ---
const formatEnumString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// --- HELPER: Fix Image URLs ---
const getImageUrl = (path: string | null | undefined) => {
    if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const BASE_URL = `http://${MY_IP}:8080`;
    return path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
};

// --- Helper: Seriousness colorization ---
const hexToRgb = (hex: string) => {
    const clean = hex.replace('#','');
    const bigint = parseInt(clean, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};
const rgbToHex = (r:number,g:number,b:number) => {
    const toHex = (x:number) => ('0' + x.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
const interpolateColor = (a:string, b:string, t:number) => {
    const A = hexToRgb(a); const B = hexToRgb(b);
    const r = Math.round(A.r + (B.r - A.r) * t);
    const g = Math.round(A.g + (B.g - A.g) * t);
    const bl = Math.round(A.b + (B.b - A.b) * t);
    return rgbToHex(r,g,bl);
};

const seriousnessColor = (score?: number) => {
    if (score == null) return '#6B7280';
    if (score === 0) return '#6B7280';
    const mag = Math.min(Math.abs(score), 10) / 10;
    if (score > 0) return interpolateColor('#D1FAE5', '#059669', mag);
    return interpolateColor('#FEE2E2', '#B91C1C', mag);
};

const seriousnessTextColor = (score?: number) => {
    const bg = seriousnessColor(score);
    const { r, g, b } = hexToRgb(bg);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000' : '#fff';
};

// --- MATCH OVERLAY COMPONENT ---
const MatchOverlay = ({ visible, tenant, propertyImage, onClose, onChat }: any) => {
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

    if (!visible || !tenant) return null;

    const tenantImg = getImageUrl(tenant.photos?.[0] || tenant.picture);

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalBackground} />
                <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate: '-5deg' }] }}>
                    <Text style={styles.matchTitle}>It's a Match!</Text>
                </Animated.View>
                <Text style={styles.matchSubtitle}>You and {tenant.firstName} like each other.</Text>
                <View style={styles.avatarsRow}>
                    <Animated.View style={{ transform: [{ translateX: slideLeft }] }}>
                        <Image source={{ uri: tenantImg }} style={[styles.matchAvatar, styles.leftAvatar]} />
                    </Animated.View>
                    <Animated.View style={{ transform: [{ translateX: slideRight }] }}>
                        <Image source={{ uri: propertyImage }} style={[styles.matchAvatar, styles.rightAvatar]} />
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

// --- TENANT CARD ---
// Added onReport prop
const TenantCard = memo(({ tenant, isTopCard, onOpenGallery, propertyRequirements, onReport }: { tenant: any, isTopCard: boolean, onOpenGallery: () => void, propertyRequirements: any, onReport: () => void }) => {
    const rawPhoto = (tenant.photos && tenant.photos.length > 0) ? tenant.photos[0] : tenant.picture;
    const imageUri = getImageUrl(rawPhoto);
    const photoCount = tenant.photos ? tenant.photos.length : 0;

    const smokerWarning = propertyRequirements?.smokerFriendly === false && tenant.isSmoker === true;
    const smokerMatch = propertyRequirements?.smokerFriendly === false && tenant.isSmoker === false;
    const petWarning = propertyRequirements?.petFriendly === false && tenant.hasPets === true;
    const petMatch = propertyRequirements?.petFriendly === false && tenant.hasPets === false;
    const typeMatch = propertyRequirements?.preferredTenants?.includes(tenant.tenantType);

    return (
        <View style={styles.cardInner}>
            <View style={styles.imageContainer}>
                {/* Image Click Area */}
                <TouchableOpacity
                    style={styles.imageTouchArea}
                    activeOpacity={1}
                    onPress={onOpenGallery}
                    disabled={!isTopCard}
                >
                    <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} style={styles.imageGradient} />
                </TouchableOpacity>

                {/* Photo Badge (Top Left now, to make room for Report button) */}
                {photoCount > 1 && (
                    <View style={[styles.photoCountBadge, { left: 16, right: undefined }]}>
                        <Ionicons name="images" size={12} color="#FFF" />
                        <Text style={styles.photoCountText}>1/{photoCount}</Text>
                    </View>
                )}

                {/* --- 2. REPORT BUTTON (Top Right) --- */}
                {isTopCard && (
                    <TouchableOpacity
                        style={styles.reportIconBtn}
                        onPress={(e) => {
                            if (Platform.OS === 'web') e.stopPropagation();
                            onReport();
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="flag" size={20} color="#EF4444" />
                    </TouchableOpacity>
                )}

                <View style={styles.overlayContent}>
                    <Text style={styles.nameText}>
                        {tenant.firstName} {tenant.lastName ? tenant.lastName[0] + '.' : ''}
                        <Text style={styles.ageText}>  {tenant.age ? `, ${tenant.age}` : ''}</Text>
                    </Text>
                    {typeof tenant.seriousnessScore !== 'undefined' && (
                        <View style={styles.seriousnessInline}>
                            <Text style={styles.seriousnessInlineText}>Serious: </Text>
                            <View style={[styles.seriousnessInlineBadge, { backgroundColor: seriousnessColor(tenant.seriousnessScore) }]}>
                                <Text style={[styles.seriousnessInlineBadgeText, { color: seriousnessTextColor(tenant.seriousnessScore) }]}>{tenant.seriousnessScore}</Text>
                            </View>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {tenant.tenantType && (
                            <View style={[styles.badgeRow, typeMatch && styles.badgeRowMatch]}>
                                <Ionicons name="person" size={12} color="#FFF" />
                                <Text style={styles.badgeText}>{formatEnumString(tenant.tenantType)}</Text>
                            </View>
                        )}
                        {tenant.occupation && (
                            <View style={styles.badgeRow}>
                                <Ionicons name="briefcase" size={12} color="#FFF" />
                                <Text style={styles.badgeText}>{tenant.occupation}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.contentWrapper}>
                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={isTopCard} scrollEnabled={isTopCard}>
                    {(smokerWarning || petWarning) && (
                        <View style={styles.warningContainer}>
                            <Text style={styles.warningHeader}>⚠️ Potential Mismatches</Text>
                            <View style={styles.statsRow}>
                                {smokerWarning && <View style={styles.warningTag}><Ionicons name="alert-circle" size={14} color="#B91C1C" /><Text style={styles.warningText}>Smoker</Text></View>}
                                {petWarning && <View style={styles.warningTag}><Ionicons name="alert-circle" size={14} color="#B91C1C" /><Text style={styles.warningText}>Has Pets</Text></View>}
                            </View>
                        </View>
                    )}
                    <Text style={styles.sectionTitle}>About Me</Text>
                    <Text style={styles.bioText}>{tenant.bio || "No bio provided yet."}</Text>
                    <View style={styles.statsRow}>
                        {smokerMatch ? <View style={[styles.tag, styles.tagMatch]}><Ionicons name="leaf" size={14} color="#059669" /><Text style={[styles.tagText, { color: '#059669' }]}>Non-Smoker</Text></View> : !tenant.isSmoker && <View style={styles.tag}><Text style={styles.tagText}>Non-Smoker</Text></View>}
                        {petMatch ? <View style={[styles.tag, styles.tagMatch]}><Ionicons name="paw" size={14} color="#059669" /><Text style={[styles.tagText, { color: '#059669' }]}>No Pets</Text></View> : !tenant.hasPets && <View style={styles.tag}><Text style={styles.tagText}>No Pets</Text></View>}
                        {tenant.minRooms > 0 && <View style={styles.tag}><Ionicons name="grid-outline" size={14} color={Blue[600]} /><Text style={styles.tagText}>Needs {tenant.minRooms}+ Rooms</Text></View>}
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </View>
    );
});

export default function LandlordHomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { getAccessToken } = useAuth();
    const { data: properties, refetch: refetchProperties } = useMyListings();

    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoadingFeed, setIsLoadingFeed] = useState(false);

    const [isGalleryVisible, setIsGalleryVisible] = useState(false);
    const [matchModalVisible, setMatchModalVisible] = useState(false);
    const [matchedTenant, setMatchedTenant] = useState<any>(null);
    const [currentMatchId, setCurrentMatchId] = useState<number | null>(null);

    // Report State
    const [reportModalVisible, setReportModalVisible] = useState(false);

    const [position] = useState(new Animated.ValueXY());
    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    useEffect(() => {
        if (!selectedPropertyId && properties && properties.length > 0) {
            setSelectedPropertyId(properties[0].id.toString());
        }
    }, [properties, selectedPropertyId]);

    const fetchFeed = useCallback(async () => {
        if (!selectedPropertyId) return;
        setIsLoadingFeed(true);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/feed?propertyId=${selectedPropertyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTenants(data);
                setCurrentIndex(0);
            } else {
                setTenants([]);
            }
        } catch (error) {
            setTenants([]);
            console.error(error);
        } finally {
            setIsLoadingFeed(false);
        }
    }, [getAccessToken, MY_IP, selectedPropertyId]);

    useFocusEffect(
        useCallback(() => {
            refetchProperties();
            if (selectedPropertyId) fetchFeed();
        }, [selectedPropertyId])
    );

    const swipeCard = useCallback((direction: 'left' | 'right') => {
        const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
        const tenantToSwipe = tenants[currentIndex];

        Animated.spring(position, { toValue: { x, y: -50 }, useNativeDriver: false, speed: 40 }).start(async () => {
            setCurrentIndex(prev => prev + 1);
            position.setValue({ x: 0, y: 0 });
            if (!tenantToSwipe || !selectedPropertyId) return;
            try {
                const token = await getAccessToken();
                const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
                const body = JSON.stringify({ tenantId: tenantToSwipe.id, propertyId: parseInt(selectedPropertyId) });
                if (direction === 'right') {
                    const response = await fetch(`http://${MY_IP}:8080/api/matches/landlord/invite`, { method: 'POST', headers, body });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'MATCHED') {
                            setMatchedTenant(tenantToSwipe);
                            setCurrentMatchId(data.id);
                            setMatchModalVisible(true);
                        }
                    }
                } else {
                    await fetch(`http://${MY_IP}:8080/api/matches/landlord/pass`, { method: 'POST', headers, body });
                }
            } catch (error) { console.error("Error processing swipe:", error); }
        });
    }, [tenants, currentIndex, selectedPropertyId, getAccessToken, MY_IP, position]);

    const resetPosition = useCallback(() => {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 4 }).start();
    }, [position]);

    const panResponder = useMemo(() => PanResponder.create({
        // 3. FIX: Set to FALSE so buttons can be clicked
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
        onPanResponderMove: (_, gesture) => { position.setValue({ x: gesture.dx, y: gesture.dy }); },
        onPanResponderRelease: (_, gesture) => {
            if (gesture.dx > SWIPE_THRESHOLD) swipeCard('right');
            else if (gesture.dx < -SWIPE_THRESHOLD) swipeCard('left');
            else resetPosition();
        },
    }), [currentIndex, tenants, swipeCard, resetPosition, position]);

    const handleReportPress = () => {
        setReportModalVisible(true);
    };

    const handleSubmitReport = async (reason: string, description: string) => {
        const currentTenant = tenants[currentIndex];
        if (!currentTenant) return;

        try {
            const token = await getAccessToken();
            await fetch(`http://${MY_IP}:8080/api/reports`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportedUserId: currentTenant.id,
                    reason,
                    description,
                    type: 'USER_PROFILE', // Landlords report Tenants (Profiles)
                    contentSnapshot: `Tenant: ${currentTenant.firstName} ${currentTenant.lastName || ''}`
                })
            });
            Alert.alert("Report Submitted", "Thank you. We will review this user.");
        } catch (error) {
            Alert.alert("Error", "Could not submit report.");
        }
    };

    const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' });
    const nextCardScale = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: [1, 0.95, 1], extrapolate: 'clamp' });
    const likeOpacity = position.x.interpolate({ inputRange: [0, SCREEN_WIDTH / 4], outputRange: [0, 1] });
    const nopeOpacity = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 4, 0], outputRange: [1, 0] });

    const currentTenant = tenants[currentIndex];
    const nextTenant = tenants[currentIndex + 1];
    const galleryImages = currentTenant?.photos?.map((p: string) => getImageUrl(p)) || (currentTenant?.picture ? [getImageUrl(currentTenant.picture)] : []);
    const currentPropertyReqs = properties?.find((p: any) => p.id.toString() === selectedPropertyId);
    const propertyImage = currentPropertyReqs?.images?.[0] ? getImageUrl(currentPropertyReqs.images[0].url) : 'https://via.placeholder.com/150';

    if (isLoadingFeed && tenants.length === 0) return <ActivityIndicator style={styles.centered} size="large" color={Blue[600]} />;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerLabel}>Recruiting for:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorContent}>
                    {properties?.map((p: any) => (
                        <TouchableOpacity key={p.id} style={[styles.propertyChip, selectedPropertyId === p.id.toString() && styles.propertyChipActive]} onPress={() => { setSelectedPropertyId(p.id.toString()); setTenants([]); setCurrentIndex(0); }}>
                            <Text style={[styles.propertyChipText, selectedPropertyId === p.id.toString() && styles.propertyChipTextActive]}>{p.title}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.addPropertyChip} onPress={() => router.push('/(landlord)/add-property')}><Ionicons name="add" size={16} color={Blue[600]} /></TouchableOpacity>
                </ScrollView>
            </View>

            {!currentTenant ? (
                <EmptyState icon="people-outline" title="No new candidates" description={!selectedPropertyId ? "Select a property above." : "We couldn't find any new tenants."} actionLabel="Refresh Feed" onAction={fetchFeed} />
            ) : (
                <>
                    <View style={styles.cardContainer}>
                        {nextTenant && (
                            <Animated.View style={[styles.card, styles.nextCard, { transform: [{ scale: nextCardScale }] }]}>
                                <TenantCard tenant={nextTenant} isTopCard={false} onOpenGallery={() => {}} propertyRequirements={currentPropertyReqs} onReport={() => {}} />
                            </Animated.View>
                        )}
                        <Animated.View style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]} {...panResponder.panHandlers}>
                            <TenantCard
                                tenant={currentTenant}
                                isTopCard={true}
                                onOpenGallery={() => setIsGalleryVisible(true)}
                                propertyRequirements={currentPropertyReqs}
                                onReport={handleReportPress}
                            />
                            <Animated.View style={[styles.indicator, styles.inviteIndicator, { opacity: likeOpacity }]}><Text style={styles.indicatorTextInvite}>INVITE</Text></Animated.View>
                            <Animated.View style={[styles.indicator, styles.passIndicator, { opacity: nopeOpacity }]}><Text style={styles.indicatorTextPass}>PASS</Text></Animated.View>
                        </Animated.View>
                    </View>
                    <SwipeButtons onInterested={() => swipeCard('right')} onNotInterested={() => swipeCard('left')} />
                </>
            )}

            <ImageGalleryModal visible={isGalleryVisible} images={galleryImages} onClose={() => setIsGalleryVisible(false)} />
            <MatchOverlay
                visible={matchModalVisible}
                tenant={matchedTenant}
                propertyImage={propertyImage}
                onClose={() => setMatchModalVisible(false)}
                onChat={() => {
                    setMatchModalVisible(false);
                    if (currentMatchId && matchedTenant) {
                        const name = `${matchedTenant.firstName} ${matchedTenant.lastName || ''}`.trim();
                        router.push({ pathname: '/chat-room', params: { chatId: currentMatchId, title: name } });
                    } else {
                        router.push('/(landlord)/matches');
                    }
                }}
            />
            {/* Report Modal */}
            <ReportModal visible={reportModalVisible} onClose={() => setReportModalVisible(false)} onSubmit={handleSubmitReport} targetName={currentTenant?.firstName || 'Tenant'} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { backgroundColor: '#FFFFFF', paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Neutral[200] },
    headerLabel: { paddingHorizontal: Spacing.base, fontSize: 11, color: Neutral[400], marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
    selectorContent: { paddingHorizontal: Spacing.base, gap: 8 },
    propertyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Neutral[100], borderWidth: 1, borderColor: 'transparent' },
    propertyChipActive: { backgroundColor: Blue[50], borderColor: Blue[200] },
    propertyChipText: { fontSize: 13, color: Neutral[600], fontWeight: '500' },
    propertyChipTextActive: { color: Blue[700], fontWeight: '600' },
    addPropertyChip: { width: 32, height: 32, borderRadius: 16, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center' },
    cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -Spacing.lg },
    card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: BorderRadius['2xl'], ...Shadows.xl, position: 'absolute' },
    nextCard: { zIndex: 0 },
    cardInner: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: BorderRadius['2xl'], overflow: 'hidden' },

    // Image & Overlay
    imageContainer: { height: '65%', position: 'relative' },
    imageTouchArea: { width: '100%', height: '100%' },
    cardImage: { width: '100%', height: '100%' },
    imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%' },
    photoCountBadge: { position: 'absolute', top: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
    photoCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

    // Report Button
    reportIconBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FFF',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 50
    },

    overlayContent: { position: 'absolute', bottom: 16, left: 16, right: 16 },
    seriousnessInline: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    seriousnessInlineText: { color: '#FFF', marginRight: 6, fontSize: 12 },
    seriousnessInlineBadge: { minWidth: 34, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    seriousnessInlineBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    nameText: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width:0, height:1}, textShadowRadius: 3 },
    ageText: { fontSize: 22, fontWeight: '400' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    badgeRowMatch: { backgroundColor: '#10B981' },
    badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    contentWrapper: { flex: 1 },
    scrollContent: { padding: Spacing.md },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: Neutral[400], textTransform: 'uppercase', marginBottom: 6 },
    bioText: { fontSize: 15, color: Neutral[800], lineHeight: 22, marginBottom: Spacing.lg },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Blue[50], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
    tagMatch: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 },
    tagText: { fontSize: 12, color: Blue[700], fontWeight: '600' },
    warningContainer: { marginBottom: 16, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
    warningHeader: { fontSize: 12, fontWeight: 'bold', color: '#B91C1C', marginBottom: 6 },
    warningTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4, borderWidth: 1, borderColor: '#FCA5A5' },
    warningText: { fontSize: 12, color: '#B91C1C', fontWeight: '600' },
    indicator: { position: 'absolute', top: 40, padding: 8, borderWidth: 3, borderRadius: 8, transform: [{ rotate: '-15deg' }], zIndex: 99 },
    inviteIndicator: { left: 40, borderColor: '#10B981', transform: [{ rotate: '-15deg' }] },
    passIndicator: { right: 40, borderColor: '#EF4444', transform: [{ rotate: '15deg' }] },
    indicatorTextInvite: { fontSize: 32, fontWeight: 'bold', color: '#10B981', letterSpacing: 2 },
    indicatorTextPass: { fontSize: 32, fontWeight: 'bold', color: '#EF4444', letterSpacing: 2 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
    matchTitle: { fontSize: 48, fontWeight: 'bold', color: '#4ADE80', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
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