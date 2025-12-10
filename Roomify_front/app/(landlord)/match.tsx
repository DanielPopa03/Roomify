import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, UserCard, EmptyState, Button, Card, Avatar } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// Mock interested users data
const MOCK_INTERESTED_USERS = [
    { 
        id: '1', 
        name: 'Sarah Jenkins',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        occupation: 'Graphic Designer',
        age: 28,
        bio: 'Looking for a quiet place near the city center. I have a cat named Whiskers.',
        propertyId: '1',
        propertyTitle: 'Modern Downtown Apartment',
        interestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        status: 'pending', // pending, accepted, declined
    },
    { 
        id: '2', 
        name: 'Michael Chen',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        occupation: 'Software Engineer',
        age: 32,
        bio: 'Remote worker, quiet tenant. Non-smoker with stable income.',
        propertyId: '1',
        propertyTitle: 'Modern Downtown Apartment',
        interestedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        status: 'pending',
    },
    { 
        id: '3', 
        name: 'Emily Davis',
        avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
        occupation: 'Marketing Manager',
        age: 30,
        bio: 'Professional looking for a nice apartment. Have excellent references.',
        propertyId: '2',
        propertyTitle: 'Cozy Studio Near Park',
        interestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: 'accepted',
    },
    { 
        id: '4', 
        name: 'James Wilson',
        avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
        occupation: 'Teacher',
        age: 35,
        bio: 'Single professional, looking for long-term rental. Very responsible tenant.',
        propertyId: '3',
        propertyTitle: 'Spacious Family Home',
        interestedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        status: 'pending',
    },
];

// Mock properties for filter
const MOCK_PROPERTIES = [
    { id: 'all', title: 'All Properties' },
    { id: '1', title: 'Modern Downtown Apartment' },
    { id: '2', title: 'Cozy Studio Near Park' },
    { id: '3', title: 'Spacious Family Home' },
];

export default function LandlordInterestedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    
    const [selectedProperty, setSelectedProperty] = useState<string>(
        params.propertyId as string || 'all'
    );
    const [interestedUsers, setInterestedUsers] = useState(MOCK_INTERESTED_USERS);
    
    const filteredUsers = useMemo(() => {
        if (selectedProperty === 'all') {
            return interestedUsers.filter(u => u.status === 'pending');
        }
        return interestedUsers.filter(
            u => u.propertyId === selectedProperty && u.status === 'pending'
        );
    }, [selectedProperty, interestedUsers]);
    
    const handleAccept = (userId: string) => {
        Alert.alert(
            'Accept Tenant',
            'Do you want to accept this tenant? They will be notified and can start a conversation with you.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Accept', 
                    onPress: () => {
                        setInterestedUsers(prev => 
                            prev.map(u => u.id === userId ? { ...u, status: 'accepted' } : u)
                        );
                        Alert.alert('Success', 'Tenant accepted! They can now message you.');
                    }
                }
            ]
        );
    };
    
    const handleDecline = (userId: string) => {
        Alert.alert(
            'Decline Tenant',
            'Are you sure you want to decline this tenant?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Decline', 
                    style: 'destructive',
                    onPress: () => {
                        setInterestedUsers(prev => 
                            prev.map(u => u.id === userId ? { ...u, status: 'declined' } : u)
                        );
                    }
                }
            ]
        );
    };
    
    const handleViewProfile = (userId: string) => {
        // Navigate to detailed user profile (to be implemented)
        console.log('View profile:', userId);
    };
    
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
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
                    {MOCK_PROPERTIES.map(property => (
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
            
            {filteredUsers.length === 0 ? (
                <EmptyState 
                    icon="people-outline"
                    title="No interested users"
                    description={
                        selectedProperty === 'all' 
                            ? "When users show interest in your properties, they'll appear here."
                            : "No users have shown interest in this property yet."
                    }
                />
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <UserCard
                            name={item.name}
                            avatar={item.avatar}
                            occupation={item.occupation}
                            age={item.age}
                            bio={item.bio}
                            propertyTitle={item.propertyTitle}
                            timestamp={formatTime(item.interestedAt)}
                            onAccept={() => handleAccept(item.id)}
                            onDecline={() => handleDecline(item.id)}
                            onViewProfile={() => handleViewProfile(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
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
    filterContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    filterScroll: {
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Neutral[100],
        marginRight: Spacing.sm,
    },
    filterChipActive: {
        backgroundColor: Blue[600],
    },
    filterChipText: {
        fontSize: Typography.size.sm,
        color: Neutral[600],
        fontWeight: Typography.weight.medium,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: 100,
    },
});
