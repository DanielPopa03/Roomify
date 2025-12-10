import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, Card, Button, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMyListings, usePropertyMutations } from '@/hooks/useApi';

// Mock properties data (fallback)
const MOCK_PROPERTIES = [
    {
        id: '1',
        images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'],
        title: 'Modern Downtown Apartment',
        price: 1200,
        location: 'Manhattan, New York',
        interestedCount: 5,
        status: 'active',
    },
    {
        id: '2',
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'],
        title: 'Cozy Studio Near Park',
        price: 950,
        location: 'Brooklyn, New York',
        interestedCount: 3,
        status: 'active',
    },
    {
        id: '3',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'],
        title: 'Spacious Family Home',
        price: 2500,
        location: 'Queens, New York',
        interestedCount: 8,
        status: 'active',
    },
];

export default function LandlordPropertiesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    
    // API hooks
    const { data: apiProperties, isLoading, error, refetch } = useMyListings();
    const { deleteProperty } = usePropertyMutations();
    
    const [properties, setProperties] = useState(MOCK_PROPERTIES);
    const [refreshing, setRefreshing] = useState(false);
    
    // Update properties when API data arrives
    useEffect(() => {
        if (apiProperties && apiProperties.length > 0) {
            setProperties(apiProperties.map(p => ({
                ...p,
                images: p.images || ['https://images.unsplash.com/photo-1568605114967-8130f3a36994'],
                interestedCount: 0,
                status: 'active',
            })));
        }
    }, [apiProperties]);
    
    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };
    
    const handleAddProperty = () => {
        // Navigate to add property screen (to be implemented)
        Alert.alert('Add Property', 'Property creation will be available soon!');
    };
    
    const handleEditProperty = (propertyId: string) => {
        // Navigate to edit property screen
        console.log('Edit property:', propertyId);
    };
    
    const handleViewInterested = (propertyId: string) => {
        // Navigate to interested users for this property
        router.push(`/(landlord)/match?propertyId=${propertyId}`);
    };
    
    const handleDeleteProperty = async (propertyId: string) => {
        Alert.alert(
            'Delete Property',
            'Are you sure you want to delete this property?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteProperty(propertyId);
                        if (success) {
                            setProperties(prev => prev.filter(p => p.id !== propertyId));
                        }
                    }
                },
            ]
        );
    };
    
    const renderProperty = ({ item }: { item: typeof MOCK_PROPERTIES[0] }) => (
        <Card shadow="md" style={styles.propertyCard}>
            <Image source={{ uri: item.images?.[0] }} style={styles.propertyImage} />
            
            <View style={styles.propertyContent}>
                <View style={styles.propertyHeader}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>${item.price}</Text>
                        <Text style={styles.priceUnit}>/month</Text>
                    </View>
                    <View style={[
                        styles.statusBadge, 
                        item.status === 'active' ? styles.statusActive : styles.statusInactive
                    ]}>
                        <Text style={[
                            styles.statusText,
                            item.status === 'active' ? styles.statusTextActive : styles.statusTextInactive
                        ]}>
                            {item.status === 'active' ? 'Active' : 'Inactive'}
                        </Text>
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
                    
                    <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => handleEditProperty(item.id)}
                    >
                        <Ionicons name="create-outline" size={18} color={Neutral[600]} />
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <Header 
                title="My Properties"
                user={user}
                onProfilePress={() => router.push('/(landlord)/profile')}
                rightAction={
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={handleAddProperty}
                    >
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
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor={Blue[600]}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Neutral[50],
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Blue[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: 100,
    },
    propertyCard: {
        marginBottom: Spacing.base,
        overflow: 'hidden',
    },
    propertyImage: {
        width: '100%',
        height: 180,
    },
    propertyContent: {
        padding: Spacing.md,
    },
    propertyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    price: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        color: Blue[600],
    },
    priceUnit: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginLeft: 2,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    statusActive: {
        backgroundColor: '#DCFCE7',
    },
    statusInactive: {
        backgroundColor: Neutral[100],
    },
    statusText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
    },
    statusTextActive: {
        color: '#16A34A',
    },
    statusTextInactive: {
        color: Neutral[500],
    },
    title: {
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.semibold,
        color: Neutral[900],
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    location: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginLeft: 4,
    },
    features: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    featureText: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Neutral[100],
    },
    interestedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Blue[50],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    interestedText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
        color: Blue[600],
    },
    editButton: {
        padding: Spacing.sm,
        backgroundColor: Neutral[100],
        borderRadius: BorderRadius.lg,
    },
});
