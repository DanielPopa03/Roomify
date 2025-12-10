import React, { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Header, SwipeButtons, Card, EmptyState, FilterButton, Avatar } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useProperties, useInteractions } from '@/hooks/useApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH - (Spacing.md * 2);
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;

// Mock properties data (fallback when API is unavailable)
const MOCK_PROPERTIES = [
    {
        id: '1',
        images: [
            'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        ],
        title: 'Modern Downtown Apartment',
        price: 1200,
        location: 'Manhattan, New York',
        description: 'Beautiful 2-bedroom apartment in the heart of the city. Close to subway and parks. Newly renovated with modern appliances.',
        bedrooms: 2,
        bathrooms: 1,
        area: 850,
        amenities: ['Parking', 'Gym', 'Pet Friendly', 'Laundry'],
        landlord: { name: 'John Smith', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', rating: 4.8 },
    },
    {
        id: '2',
        images: [
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        ],
        title: 'Cozy Studio Near Park',
        price: 950,
        location: 'Brooklyn, New York',
        description: 'Charming studio with lots of natural light. Walking distance to Prospect Park.',
        bedrooms: 1,
        bathrooms: 1,
        area: 450,
        amenities: ['Natural Light', 'Park View', 'Doorman'],
        landlord: { name: 'Sarah Johnson', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', rating: 4.9 },
    },
    {
        id: '3',
        images: [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        ],
        title: 'Spacious Family Home',
        price: 2500,
        location: 'Queens, New York',
        description: 'Perfect for families. Large backyard, garage, and excellent school district.',
        bedrooms: 4,
        bathrooms: 2,
        area: 2200,
        amenities: ['Backyard', 'Garage', 'Storage', 'Near Schools'],
        landlord: { name: 'Michael Brown', avatar: 'https://randomuser.me/api/portraits/men/75.jpg', rating: 4.7 },
    },
];

export default function BrowseScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    
    // API hooks
    const { data: apiProperties, isLoading, error, refetch } = useProperties();
    const { expressInterest, pass } = useInteractions();
    
    // Use API data or fallback to mock
    const [properties, setProperties] = useState(MOCK_PROPERTIES);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Update properties when API data arrives
    useEffect(() => {
        if (apiProperties && apiProperties.length > 0) {
            setProperties(apiProperties.map(p => ({
                ...p,
                images: p.images || ['https://images.unsplash.com/photo-1568605114967-8130f3a36994'],
                amenities: p.amenities || ['Modern', 'Clean'],
                landlord: p.landlord || { name: 'Property Owner', rating: 4.5 },
            })));
            setCurrentIndex(0);
        }
    }, [apiProperties]);
    
    // Reset image index when property changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [currentIndex]);
    
    const position = useRef(new Animated.ValueXY()).current;
    const scaleValue = useRef(new Animated.Value(1)).current;
    
    const currentProperty = properties[currentIndex];
    const nextProperty = properties[currentIndex + 1];
    
    const rotate = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ['-12deg', '0deg', '12deg'],
        extrapolate: 'clamp',
    });
    
    const nextCardScale = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: [1, 0.92, 1],
        extrapolate: 'clamp',
    });
    
    const nextCardOpacity = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: [1, 0.6, 1],
        extrapolate: 'clamp',
    });
    
    const cardStyle = {
        transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
    };
    
    const nextCardStyle = {
        transform: [{ scale: nextCardScale }],
        opacity: nextCardOpacity,
    };
    
    const interestedOpacity = position.x.interpolate({
        inputRange: [0, SCREEN_WIDTH / 4],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });
    
    const notInterestedOpacity = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 4, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });
    
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                position.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    swipeCard('right');
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    swipeCard('left');
                } else {
                    resetPosition();
                }
            },
        })
    ).current;
    
    const swipeCard = useCallback((direction: 'left' | 'right') => {
        const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
        
        // Animate card exit with spring effect
        Animated.spring(position, {
            toValue: { x, y: direction === 'right' ? -50 : -50 },
            useNativeDriver: false,
            speed: 15,
            bounciness: 3,
        }).start(() => {
            position.setValue({ x: 0, y: 0 });
            setCurrentIndex((prev) => prev + 1);
            
            // Call API to record the interaction
            if (currentProperty) {
                if (direction === 'right') {
                    expressInterest(currentProperty.id);
                } else {
                    pass(currentProperty.id);
                }
            }
        });
    }, [currentProperty, position, expressInterest, pass]);
    
    const resetPosition = () => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
        }).start();
    };
    
    const handleInterested = () => swipeCard('right');
    const handleNotInterested = () => swipeCard('left');
    
    // Handle image navigation
    const handleImageTap = (side: 'left' | 'right') => {
        if (!currentProperty?.images) return;
        const totalImages = currentProperty.images.length;
        
        if (side === 'right' && currentImageIndex < totalImages - 1) {
            setCurrentImageIndex(prev => prev + 1);
        } else if (side === 'left' && currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
        }
    };
    
    // Render image pagination dots
    const renderImageDots = () => {
        if (!currentProperty?.images || currentProperty.images.length <= 1) return null;
        
        return (
            <View style={styles.imageDots}>
                {currentProperty.images.map((_, index) => (
                    <View 
                        key={index} 
                        style={[
                            styles.imageDot, 
                            index === currentImageIndex && styles.imageDotActive
                        ]} 
                    />
                ))}
            </View>
        );
    };
    
    // Render amenity tags
    const renderAmenities = () => {
        if (!currentProperty?.amenities) return null;
        
        return (
            <View style={styles.amenitiesContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.amenitiesContent}
                >
                    {currentProperty.amenities.slice(0, 4).map((amenity, index) => (
                        <View key={index} style={styles.amenityTag}>
                            <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };
    
    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <Header 
                    title="Roomify"
                    user={user}
                    onProfilePress={() => router.push('/(normal)/profile')}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Blue[500]} />
                    <Text style={styles.loadingText}>Finding properties for you...</Text>
                </View>
            </View>
        );
    }
    
    // No more properties
    if (!currentProperty) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Header 
                    title="Roomify"
                    user={user}
                    onProfilePress={() => router.push('/(normal)/profile')}
                    rightAction={<FilterButton onPress={() => console.log('Filter')} />}
                />
                <EmptyState 
                    icon="home-outline"
                    title="No more properties"
                    description="You've seen all available properties. Check back later for new listings!"
                    actionLabel="Refresh"
                    onAction={() => {
                        refetch();
                        setProperties(MOCK_PROPERTIES);
                        setCurrentIndex(0);
                    }}
                />
            </View>
        );
    }
    
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <Header 
                title="Roomify"
                user={user}
                onProfilePress={() => router.push('/(normal)/profile')}
                rightAction={<FilterButton onPress={() => console.log('Filter')} />}
            />
            
            {/* Cards Stack */}
            <View style={styles.cardContainer}>
                {/* Next Card Preview (behind current card) */}
                {nextProperty && (
                    <Animated.View style={[styles.card, styles.nextCard, nextCardStyle]}>
                        <Image
                            source={{ uri: nextProperty.images?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994' }}
                            style={styles.cardImage}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.imageGradient}
                        />
                    </Animated.View>
                )}
                
                {/* Current Card */}
                <Animated.View 
                    style={[styles.card, cardStyle]} 
                    {...panResponder.panHandlers}
                >
                    {/* Property Image with tap zones */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: currentProperty.images?.[currentImageIndex] || currentProperty.images?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994' }}
                            style={styles.cardImage}
                            resizeMode="cover"
                        />
                        
                        {/* Image Navigation Tap Zones */}
                        <View style={styles.imageTapZones}>
                            <TouchableOpacity 
                                style={styles.tapZoneLeft} 
                                onPress={() => handleImageTap('left')}
                                activeOpacity={1}
                            />
                            <TouchableOpacity 
                                style={styles.tapZoneRight} 
                                onPress={() => handleImageTap('right')}
                                activeOpacity={1}
                            />
                        </View>
                        
                        {/* Image Gradient Overlay */}
                        <LinearGradient
                            colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
                            locations={[0, 0.2, 0.6, 1]}
                            style={styles.imageGradient}
                        />
                        
                        {/* Image Pagination Dots */}
                        {renderImageDots()}
                        
                        {/* Price Badge on Image */}
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceBadgeText}>${currentProperty.price}</Text>
                            <Text style={styles.priceBadgeUnit}>/mo</Text>
                        </View>
                    </View>
                    
                    {/* Swipe Indicators */}
                    <Animated.View style={[styles.indicator, styles.interestedIndicator, { opacity: interestedOpacity }]}>
                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                        <Text style={styles.indicatorText}>INTERESTED</Text>
                    </Animated.View>
                    
                    <Animated.View style={[styles.indicator, styles.notInterestedIndicator, { opacity: notInterestedOpacity }]}>
                        <Ionicons name="close-circle" size={28} color="#EF4444" />
                        <Text style={[styles.indicatorText, styles.notInterestedText]}>PASS</Text>
                    </Animated.View>
                    
                    {/* Property Info */}
                    <View style={styles.cardContent}>
                        <Text style={styles.title} numberOfLines={1}>{currentProperty.title}</Text>
                        
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={14} color={Blue[500]} />
                            <Text style={styles.location} numberOfLines={1}>{currentProperty.location}</Text>
                        </View>
                        
                        {/* Features Row */}
                        <View style={styles.features}>
                            <View style={styles.feature}>
                                <Ionicons name="bed-outline" size={16} color={Blue[600]} />
                                <Text style={styles.featureText}>{currentProperty.bedrooms || 2}</Text>
                            </View>
                            <View style={styles.featureDivider} />
                            <View style={styles.feature}>
                                <Ionicons name="water-outline" size={16} color={Blue[600]} />
                                <Text style={styles.featureText}>{currentProperty.bathrooms || 1}</Text>
                            </View>
                            <View style={styles.featureDivider} />
                            <View style={styles.feature}>
                                <Ionicons name="resize-outline" size={16} color={Blue[600]} />
                                <Text style={styles.featureText}>{currentProperty.area || 800} ft²</Text>
                            </View>
                        </View>
                        
                        {/* Amenities */}
                        {renderAmenities()}
                        
                        {/* Landlord Info */}
                        {currentProperty.landlord && (
                            <View style={styles.landlordRow}>
                                <Image 
                                    source={{ uri: currentProperty.landlord.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }}
                                    style={styles.landlordAvatar}
                                />
                                <View style={styles.landlordInfo}>
                                    <Text style={styles.landlordName}>{currentProperty.landlord.name}</Text>
                                    <View style={styles.ratingRow}>
                                        <Ionicons name="star" size={12} color="#F59E0B" />
                                        <Text style={styles.ratingText}>{currentProperty.landlord.rating || 4.5}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </View>
            
            {/* Swipe Buttons */}
            <SwipeButtons 
                onInterested={handleInterested}
                onNotInterested={handleNotInterested}
            />
            
            {/* Card Counter */}
            <View style={styles.cardCounter}>
                <Text style={styles.cardCounterText}>
                    {currentIndex + 1} of {properties.length}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Neutral[50],
    },
    cardContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        ...Shadows.xl,
    },
    nextCard: {
        position: 'absolute',
        zIndex: -1,
    },
    imageContainer: {
        height: '52%',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    imageGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
    },
    imageTapZones: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
    },
    tapZoneLeft: {
        flex: 1,
    },
    tapZoneRight: {
        flex: 1,
    },
    imageDots: {
        position: 'absolute',
        top: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    imageDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    imageDotActive: {
        backgroundColor: '#FFFFFF',
        width: 20,
    },
    priceBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: Blue[600],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    priceBadgeText: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        color: '#FFFFFF',
    },
    priceBadgeUnit: {
        fontSize: Typography.size.sm,
        color: 'rgba(255,255,255,0.8)',
        marginLeft: 2,
    },
    indicator: {
        position: 'absolute',
        top: 60,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 3,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.95)',
    },
    interestedIndicator: {
        right: 16,
        borderColor: '#10B981',
        transform: [{ rotate: '12deg' }],
    },
    notInterestedIndicator: {
        left: 16,
        borderColor: '#EF4444',
        transform: [{ rotate: '-12deg' }],
    },
    indicatorText: {
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.bold,
        color: '#10B981',
    },
    notInterestedText: {
        color: '#EF4444',
    },
    cardContent: {
        flex: 1,
        padding: Spacing.sm,
        paddingTop: Spacing.xs,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.bold,
        color: Neutral[900],
        letterSpacing: -0.3,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    location: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginLeft: 4,
        flex: 1,
    },
    features: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        paddingVertical: 6,
        backgroundColor: Blue[50],
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        justifyContent: 'center',
    },
    featureDivider: {
        width: 1,
        height: 20,
        backgroundColor: Blue[200],
    },
    featureText: {
        fontSize: Typography.size.sm,
        color: Blue[700],
        fontWeight: Typography.weight.semibold,
    },
    amenitiesContainer: {
        marginTop: Spacing.xs,
        height: 28,
    },
    amenitiesContent: {
        paddingRight: Spacing.sm,
    },
    amenityTag: {
        backgroundColor: Neutral[100],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amenityText: {
        fontSize: Typography.size.xs,
        color: Neutral[600],
        fontWeight: Typography.weight.medium,
    },
    landlordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Neutral[100],
    },
    landlordAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Neutral[200],
    },
    landlordInfo: {
        marginLeft: Spacing.sm,
    },
    landlordName: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
        color: Neutral[800],
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 2,
    },
    ratingText: {
        fontSize: Typography.size.xs,
        color: Neutral[600],
    },
    cardCounter: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 90,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    cardCounterText: {
        fontSize: Typography.size.xs,
        color: '#FFFFFF',
        fontWeight: Typography.weight.medium,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.size.base,
        color: Neutral[500],
    },
});
