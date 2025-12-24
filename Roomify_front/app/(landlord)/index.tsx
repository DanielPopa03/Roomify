import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, Card, Button, EmptyState, ImageCarousel } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMyListings, usePropertyMutations } from '@/hooks/useApi';
import { getImageUrl } from '@/services/api';

export default function LandlordPropertiesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const { data: apiProperties, isLoading, error, refetch } = useMyListings();
    const { deleteProperty } = usePropertyMutations();

    const [properties, setProperties] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    useFocusEffect(
        useCallback(() => {
            const timer = setTimeout(() => {
                refetch();
            }, 100);
            return () => clearTimeout(timer);
        }, [refetch])
    );

    useEffect(() => {
        if (apiProperties && apiProperties.length > 0) {
            const mappedProperties = apiProperties.map(p => ({
                id: p.id.toString(),
                images: p.images?.map(img => img.url.replace('localhost', MY_IP).replace('127.0.0.1', MY_IP)) || ['https://images.unsplash.com/photo-1568605114967-8130f3a36994'],
                title: p.title,
                price: p.price,
                location: p.address,
                bedrooms: p.numberOfRooms,
                bathrooms: p.hasExtraBathroom ? 2 : 1,
                // FIX: Use the count from the API
                interestedCount: p.interestedCount || 0,
                status: 'active',
            }));

            setProperties(mappedProperties);
        } else if (!isLoading && !error) {
            setProperties([]);
        }
    }, [apiProperties, isLoading, error]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleAddProperty = () => {
        router.push('/(landlord)/add-property');
    };

    const handleEditProperty = (propertyId: string) => {
        router.push(`/(landlord)/edit-property?id=${propertyId}`);
    };

    const handleViewInterested = (propertyId: string) => {
        router.push(`/(landlord)/match?propertyId=${propertyId}`);
    };

    const handleDeleteProperty = async (propertyId: string) => {
        const confirmDelete = async () => {
            const success = await deleteProperty(parseInt(propertyId));
            if (success) {
                setProperties(prev => prev.filter(p => p.id !== propertyId));
                refetch();
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this property?')) {
                await confirmDelete();
            }
        } else {
            Alert.alert(
                'Delete Property',
                'Are you sure you want to delete this property?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: confirmDelete },
                ]
            );
        }
    };

    const renderProperty = ({ item }: { item: any }) => {
        const imageUrls = (item.images || []).map(img => getImageUrl(img)).filter(url => url);

        return (
            <Card shadow="md" style={styles.propertyCard}>
                <ImageCarousel
                    images={imageUrls}
                    height={200}
                    showPageIndicator={true}
                    enableZoom={true}
                />

                <View style={styles.propertyContent}>
                    <View style={styles.propertyHeader}>
                        <View style={styles.priceContainer}>
                            <Text style={styles.price}>${item.price}</Text>
                            <Text style={styles.priceUnit}>/month</Text>
                        </View>
                        <View style={[styles.statusBadge, styles.statusActive]}>
                            <Text style={[styles.statusText, styles.statusTextActive]}>Active</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{item.title}</Text>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={Neutral[500]} />
                        <Text style={styles.location}>{item.location}</Text>
                    </View>

                    <View style={styles.features}>
                        <View style={styles.feature}>
                            <Ionicons name="bed-outline" size={16} color={Neutral[500]} />
                            <Text style={styles.featureText}>{item.bedrooms} bed</Text>
                        </View>
                        <View style={styles.feature}>
                            <Ionicons name="water-outline" size={16} color={Neutral[500]} />
                            <Text style={styles.featureText}>{item.bathrooms} bath</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.interestedButton}
                            onPress={() => handleViewInterested(item.id)}
                        >
                            <Ionicons name="people" size={18} color={Blue[600]} />
                            <Text style={styles.interestedText}>
                                {item.interestedCount} Interested
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => handleEditProperty(item.id)}
                            >
                                <Ionicons name="create-outline" size={18} color={Neutral[600]} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteProperty(item.id)}
                            >
                                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Card>
        );
    };

    if (isLoading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Blue[600]} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header
                title="My Properties"
                user={user}
                onProfilePress={() => router.push('/(landlord)/profile')}
                rightAction={
                    <TouchableOpacity style={styles.addButton} onPress={handleAddProperty}>
                        <Ionicons name="add" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                }
            />

            {properties.length === 0 ? (
                <EmptyState
                    icon="home-outline"
                    title="No properties yet"
                    description="Add your first property to start receiving interest from potential tenants."
                    actionLabel="Add Property"
                    onAction={handleAddProperty}
                />
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={item => item.id}
                    renderItem={renderProperty}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Blue[600]} />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Blue[600], alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: Spacing.base, paddingBottom: 100 },
    propertyCard: { marginBottom: Spacing.base, overflow: 'hidden' },
    propertyContent: { padding: Spacing.md },
    propertyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
    price: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Blue[600] },
    priceUnit: { fontSize: Typography.size.sm, color: Neutral[500], marginLeft: 2 },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 100 },
    statusActive: { backgroundColor: '#DCFCE7' },
    statusText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
    statusTextActive: { color: '#16A34A' },
    title: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Neutral[900] },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
    location: { fontSize: Typography.size.sm, color: Neutral[500], marginLeft: 4 },
    features: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    feature: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    featureText: { fontSize: Typography.size.sm, color: Neutral[500] },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Neutral[100] },
    interestedButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Blue[50], paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg },
    interestedText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: Blue[600] },
    editButton: { padding: Spacing.sm, backgroundColor: Neutral[100], borderRadius: BorderRadius.lg },
    actionButtons: { flexDirection: 'row', gap: Spacing.sm },
    deleteButton: { padding: Spacing.sm, backgroundColor: '#FEE2E2', borderRadius: BorderRadius.lg },
});