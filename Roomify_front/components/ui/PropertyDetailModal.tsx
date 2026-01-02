/**
 * PropertyDetailModal Component
 * Full-screen modal displaying property details from chat context
 * Shows property image, title, price, specs, description, and amenities
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { formatRent } from '../../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PropertyDetailModalProps {
    visible: boolean;
    onClose: () => void;
    propertyId: number | null;
}

// Helper to format enum strings nicely
const formatEnumString = (str: string) => {
    if (!str) return '';
    return str.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

export function PropertyDetailModal({ visible, onClose, propertyId }: PropertyDetailModalProps) {
    const insets = useSafeAreaInsets();
    const { getAccessToken } = useAuth();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    useEffect(() => {
        if (visible && propertyId) {
            fetchPropertyDetails();
        }
    }, [visible, propertyId]);

    const fetchPropertyDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/properties/${propertyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Transform images from [{url: "..."}] to proper URL strings
                const transformedData = {
                    ...data,
                    images: data.images?.map((img: any) => {
                        const url = img.url;
                        // Check if the URL is relative (doesn't start with http)
                        if (!url.startsWith('http')) {
                            return `http://${MY_IP}:8080${url}`;
                        }
                        // If already absolute, fix localhost/127.0.0.1
                        return url.replace('localhost', MY_IP).replace('127.0.0.1', MY_IP);
                    }) || []
                };
                setProperty(transformedData);
            } else {
                setError('Failed to load property details');
            }
        } catch (err) {
            console.error('Error fetching property:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setProperty(null);
        setCurrentImageIndex(0);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : 10 }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color={Neutral[900]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Property Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Blue[600]} />
                        <Text style={styles.loadingText}>Loading property details...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="alert-circle-outline" size={48} color={Neutral[400]} />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={fetchPropertyDetails}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : property ? (
                    <ScrollView 
                        style={styles.scrollView} 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    >
                        {/* Image Carousel */}
                        <View style={styles.imageContainer}>
                            {property.images && property.images.length > 0 ? (
                                <>
                                    <Image
                                        source={{ uri: property.images[currentImageIndex] }}
                                        style={styles.propertyImage}
                                        resizeMode="cover"
                                    />
                                    {/* Image Indicators */}
                                    {property.images.length > 1 && (
                                        <View style={styles.imageIndicators}>
                                            {property.images.map((_: any, index: number) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => setCurrentImageIndex(index)}
                                                    style={[
                                                        styles.indicator,
                                                        currentImageIndex === index && styles.indicatorActive
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    )}
                                    {/* Navigation Arrows */}
                                    {property.images.length > 1 && (
                                        <>
                                            <TouchableOpacity
                                                style={[styles.imageNavButton, styles.imageNavLeft]}
                                                onPress={() => setCurrentImageIndex(prev => 
                                                    prev > 0 ? prev - 1 : property.images.length - 1
                                                )}
                                            >
                                                <Ionicons name="chevron-back" size={24} color="white" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.imageNavButton, styles.imageNavRight]}
                                                onPress={() => setCurrentImageIndex(prev => 
                                                    prev < property.images.length - 1 ? prev + 1 : 0
                                                )}
                                            >
                                                <Ionicons name="chevron-forward" size={24} color="white" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </>
                            ) : (
                                <View style={[styles.propertyImage, styles.noImage]}>
                                    <Ionicons name="image-outline" size={48} color={Neutral[300]} />
                                    <Text style={styles.noImageText}>No images available</Text>
                                </View>
                            )}
                            {/* Price Badge */}
                            <View style={styles.priceBadge}>
                                <Text style={styles.priceText}>{formatRent(property.price)}</Text>
                            </View>
                        </View>

                        {/* Title & Address */}
                        <View style={styles.titleSection}>
                            <Text style={styles.propertyTitle}>{property.title}</Text>
                            <View style={styles.addressRow}>
                                <Ionicons name="location" size={18} color={Blue[600]} />
                                <Text style={styles.addressText}>{property.address}</Text>
                            </View>
                        </View>

                        {/* Specs Grid */}
                        <View style={styles.specsCard}>
                            <View style={styles.specItem}>
                                <View style={styles.specIconContainer}>
                                    <Ionicons name="grid-outline" size={22} color={Blue[600]} />
                                </View>
                                <Text style={styles.specValue}>{property.numberOfRooms}</Text>
                                <Text style={styles.specLabel}>Rooms</Text>
                            </View>
                            <View style={styles.specDivider} />
                            <View style={styles.specItem}>
                                <View style={styles.specIconContainer}>
                                    <Ionicons name="water-outline" size={22} color={Blue[600]} />
                                </View>
                                <Text style={styles.specValue}>{property.hasExtraBathroom ? 2 : 1}</Text>
                                <Text style={styles.specLabel}>Baths</Text>
                            </View>
                            <View style={styles.specDivider} />
                            <View style={styles.specItem}>
                                <View style={styles.specIconContainer}>
                                    <Ionicons name="resize-outline" size={22} color={Blue[600]} />
                                </View>
                                <Text style={styles.specValue}>{property.surface}</Text>
                                <Text style={styles.specLabel}>m²</Text>
                            </View>
                            {property.layoutType && (
                                <>
                                    <View style={styles.specDivider} />
                                    <View style={styles.specItem}>
                                        <View style={styles.specIconContainer}>
                                            <Ionicons name="home-outline" size={22} color={Blue[600]} />
                                        </View>
                                        <Text style={styles.specValue} numberOfLines={1}>
                                            {formatEnumString(property.layoutType)}
                                        </Text>
                                        <Text style={styles.specLabel}>Layout</Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About this property</Text>
                            <Text style={styles.description}>
                                {property.description || "No description available for this property."}
                            </Text>
                        </View>

                        {/* Amenities */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                <View style={styles.amenityItem}>
                                    <Ionicons 
                                        name={property.smokerFriendly ? "checkmark-circle" : "close-circle"} 
                                        size={22} 
                                        color={property.smokerFriendly ? Blue[600] : Neutral[400]} 
                                    />
                                    <Text style={[
                                        styles.amenityText,
                                        !property.smokerFriendly && styles.amenityTextDisabled
                                    ]}>
                                        Smoker Friendly
                                    </Text>
                                </View>
                                <View style={styles.amenityItem}>
                                    <Ionicons 
                                        name={property.petFriendly ? "checkmark-circle" : "close-circle"} 
                                        size={22} 
                                        color={property.petFriendly ? Blue[600] : Neutral[400]} 
                                    />
                                    <Text style={[
                                        styles.amenityText,
                                        !property.petFriendly && styles.amenityTextDisabled
                                    ]}>
                                        Pet Friendly
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Preferred Tenants */}
                        {property.preferredTenants && property.preferredTenants.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Preferred Tenants</Text>
                                <View style={styles.tagsContainer}>
                                    {property.preferredTenants.map((tenant: string, index: number) => (
                                        <View key={index} style={styles.tag}>
                                            <Ionicons name="person" size={14} color={Blue[600]} />
                                            <Text style={styles.tagText}>{formatEnumString(tenant)}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </ScrollView>
                ) : null}

                {/* Close Button at Bottom */}
                {!loading && !error && property && (
                    <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                        <TouchableOpacity style={styles.closeBottomButton} onPress={handleClose}>
                            <Ionicons name="arrow-back" size={20} color="white" />
                            <Text style={styles.closeBottomButtonText}>Back to Chat</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Neutral[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[200],
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.size.lg,
        fontWeight: '600',
        color: Neutral[900],
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.size.base,
        color: Neutral[500],
    },
    errorText: {
        marginTop: Spacing.md,
        fontSize: Typography.size.base,
        color: Neutral[600],
        textAlign: 'center',
    },
    retryButton: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Blue[600],
        borderRadius: BorderRadius.md,
    },
    retryButtonText: {
        color: 'white',
        fontSize: Typography.size.base,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: 280,
        backgroundColor: Neutral[200],
    },
    propertyImage: {
        width: '100%',
        height: '100%',
    },
    noImage: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Neutral[100],
    },
    noImageText: {
        marginTop: Spacing.sm,
        fontSize: Typography.size.sm,
        color: Neutral[400],
    },
    imageIndicators: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    indicatorActive: {
        backgroundColor: 'white',
        width: 20,
    },
    imageNavButton: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -20 }],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageNavLeft: {
        left: 12,
    },
    imageNavRight: {
        right: 12,
    },
    priceBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: Blue[600],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
    },
    priceText: {
        color: 'white',
        fontSize: Typography.size.lg,
        fontWeight: '700',
    },
    titleSection: {
        backgroundColor: 'white',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    propertyTitle: {
        fontSize: Typography.size.xl,
        fontWeight: '700',
        color: Neutral[900],
        marginBottom: Spacing.xs,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addressText: {
        fontSize: Typography.size.base,
        color: Neutral[600],
        flex: 1,
    },
    specsCard: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: Spacing.lg,
        marginTop: Spacing.sm,
    },
    specItem: {
        alignItems: 'center',
        flex: 1,
    },
    specIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Blue[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    specValue: {
        fontSize: Typography.size.lg,
        fontWeight: '700',
        color: Neutral[900],
    },
    specLabel: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginTop: 2,
    },
    specDivider: {
        width: 1,
        height: 50,
        backgroundColor: Neutral[200],
    },
    section: {
        backgroundColor: 'white',
        padding: Spacing.lg,
        marginTop: Spacing.sm,
    },
    sectionTitle: {
        fontSize: Typography.size.base,
        fontWeight: '600',
        color: Neutral[900],
        marginBottom: Spacing.sm,
    },
    description: {
        fontSize: Typography.size.base,
        color: Neutral[600],
        lineHeight: 24,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: '45%',
    },
    amenityText: {
        fontSize: Typography.size.base,
        color: Neutral[700],
    },
    amenityTextDisabled: {
        color: Neutral[400],
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Blue[50],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    tagText: {
        fontSize: Typography.size.sm,
        color: Blue[700],
        fontWeight: '500',
    },
    footer: {
        backgroundColor: 'white',
        padding: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Neutral[200],
    },
    closeBottomButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Blue[600],
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    closeBottomButtonText: {
        color: 'white',
        fontSize: Typography.size.base,
        fontWeight: '600',
    },
});

export default PropertyDetailModal;
