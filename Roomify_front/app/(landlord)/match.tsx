import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, UserCard, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LandlordInterestedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { getAccessToken, user } = useAuth();

    // --- STATE ---
    const [selectedProperty, setSelectedProperty] = useState<string>(
        params.propertyId as string || 'all'
    );
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    // --- API CALLS ---
    const fetchMatches = useCallback(async () => {
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/matches/landlord/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMatches(data);
            }
        } catch (error) {
            console.error("Network error fetching matches:", error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [getAccessToken, MY_IP]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMatches();
    };

    // --- HANDLERS (Alerts Removed) ---

    const handleAccept = async (tenantId: string, propertyId: number) => {
        // Optimistic UI update: remove from list immediately
        setMatches(prev => prev.filter(m => m.tenant.id !== tenantId));

        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/matches/landlord/swipe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tenantId, propertyId })
            });

            if (!response.ok) {
                // If failed, refresh to bring the user back
                fetchMatches();
                console.error('Failed to accept tenant');
            }
        } catch (error) {
            fetchMatches();
            console.error('Error accepting tenant:', error);
        }
    };

    const handleDecline = async (tenantId: string, propertyId: number) => {
        // Optimistic UI update: remove from list immediately
        setMatches(prev => prev.filter(m => m.tenant.id !== tenantId));

        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/matches/landlord/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tenantId, propertyId })
            });

            if (!response.ok) {
                fetchMatches();
                console.error('Failed to decline tenant');
            }
        } catch (error) {
            fetchMatches();
            console.error('Error declining tenant:', error);
        }
    };

    const handleViewProfile = (tenantId: string) => {
        router.push(`/(landlord)/tenant-profile?id=${tenantId}`);
    };

    // --- DATA PROCESSING ---
    const filteredMatches = useMemo(() => {
        if (selectedProperty === 'all') return matches;
        return matches.filter(m => m.property.id.toString() === selectedProperty);
    }, [selectedProperty, matches]);

    const uniqueProperties = useMemo(() => {
        const props = matches.map(m => ({ id: m.property.id.toString(), title: m.property.title }));
        const unique = Array.from(new Map(props.map(item => [item.id, item])).values());
        return [{ id: 'all', title: 'All Properties' }, ...unique];
    }, [matches]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Blue[600]} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header
                title="Interested Users"
                user={user}
                onProfilePress={() => router.push('/(landlord)/profile')}
            />

            {/* Property Filter */}
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    {uniqueProperties.map(property => (
                        <TouchableOpacity
                            key={property.id}
                            style={[
                                styles.filterChip,
                                selectedProperty === property.id && styles.filterChipActive
                            ]}
                            onPress={() => setSelectedProperty(property.id)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                selectedProperty === property.id && styles.filterChipTextActive
                            ]}>
                                {property.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {filteredMatches.length === 0 ? (
                <EmptyState
                    icon="people-outline"
                    title="No pending interest"
                    description={
                        selectedProperty === 'all'
                            ? "When tenants like your properties, they'll appear here."
                            : "No new users have shown interest in this property yet."
                    }
                    actionLabel="Refresh"
                    onAction={onRefresh}
                />
            ) : (
                <FlatList
                    data={filteredMatches}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <UserCard
                            name={item.tenant.firstName}
                            avatar={item.tenant.picture}
                            occupation={item.tenant.occupation || "Potential Tenant"}
                            age={item.tenant.age}
                            bio={item.tenant.bio}
                            propertyTitle={item.property.title}
                            onAccept={() => handleAccept(item.tenant.id, item.property.id)}
                            onDecline={() => handleDecline(item.tenant.id, item.property.id)}
                            onViewProfile={() => handleViewProfile(item.tenant.id)}
                        />
                    )}
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
    filterContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    filterScroll: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, flexDirection: 'row' },
    filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Neutral[100], marginRight: Spacing.sm },
    filterChipActive: { backgroundColor: Blue[600] },
    filterChipText: { fontSize: Typography.size.sm, color: Neutral[600], fontWeight: Typography.weight.medium },
    filterChipTextActive: { color: '#FFFFFF' },
    listContent: { padding: Spacing.base, paddingBottom: 100 }
});