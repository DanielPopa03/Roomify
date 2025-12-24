import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, Button, Input, Avatar, Card } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LandlordProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    
    const [fullName, setFullName] = useState(user?.name || '');
    const [companyName, setCompanyName] = useState('Anderson Properties LLC');
    const [phone, setPhone] = useState('+1 (555) 987-6543');
    const [isEditing, setIsEditing] = useState(false);
    
    // Mock stats
    const stats = {
        totalProperties: 3,
        activeListings: 2,
        totalInterested: 16,
        pendingReviews: 4,
    };
    
    const handleSave = () => {
        console.log('Saving profile:', { fullName, companyName, phone });
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
    };
    
    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const handleSwitchRole = () => {
        Alert.alert(
            'Switch Role',
            'Do you want to switch to a different role?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Switch', 
                    onPress: () => router.replace('/')
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Blue[600]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                    <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Picture */}
                <View style={styles.avatarSection}>
                    <Avatar 
                        uri={user?.picture}
                        name={user?.name || 'Landlord'}
                        size={100}
                    />
                    {isEditing && (
                        <TouchableOpacity style={styles.changePhotoButton}>
                            <Text style={styles.changePhotoText}>Change Photo</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="home" size={24} color={Blue[600]} />
                        <Text style={styles.statNumber}>{stats.totalProperties}</Text>
                        <Text style={styles.statLabel}>Properties</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text style={styles.statNumber}>{stats.activeListings}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={24} color="#F59E0B" />
                        <Text style={styles.statNumber}>{stats.totalInterested}</Text>
                        <Text style={styles.statLabel}>Interested</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="time" size={24} color="#EF4444" />
                        <Text style={styles.statNumber}>{stats.pendingReviews}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                </View>
                
                {/* Profile Info */}
                <Card shadow="sm" style={styles.infoCard}>
                    <Input
                        label="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                        editable={isEditing}
                    />
                    
                    <Input
                        label="Company Name (Optional)"
                        value={companyName}
                        onChangeText={setCompanyName}
                        placeholder="Your company or property management name"
                        editable={isEditing}
                    />
                    
                    <Input
                        label="Email"
                        value={user?.email || ''}
                        editable={false}
                        placeholder="Email"
                    />
                    
                    <Input
                        label="Phone"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+1 (555) 000-0000"
                        keyboardType="phone-pad"
                        editable={isEditing}
                    />
                    
                    {isEditing && (
                        <Button 
                            title="Save Changes"
                            onPress={handleSave}
                            style={{ marginTop: Spacing.md }}
                        />
                    )}
                </Card>
                
                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Card shadow="sm" style={styles.actionsCard}>
                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="add-circle-outline" size={22} color={Blue[600]} />
                            <Text style={styles.actionText}>Add New Property</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="stats-chart-outline" size={22} color={Blue[600]} />
                            <Text style={styles.actionText}>View Analytics</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionItem} onPress={handleSwitchRole}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="swap-horizontal-outline" size={22} color={Blue[600]} />
                            <Text style={styles.actionText}>Switch to Tenant Mode</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                </Card>
                
                {/* Support Section */}
                <Text style={styles.sectionTitle}>Support</Text>
                <Card shadow="sm" style={styles.actionsCard}>
                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="help-circle-outline" size={22} color={Blue[600]} />
                            <Text style={styles.actionText}>Help Center</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="document-text-outline" size={22} color={Blue[600]} />
                            <Text style={styles.actionText}>Terms of Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                </Card>
                
                {/* Logout Button */}
                <Button 
                    title="Logout"
                    variant="outline"
                    onPress={handleLogout}
                    style={styles.logoutButton}
                />
                
                <Text style={styles.version}>Version 1.0.0</Text>
            </ScrollView>
        </View>
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
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.md,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.semibold,
        color: Neutral[900],
    },
    editButton: {
        fontSize: Typography.size.base,
        color: Blue[600],
        fontWeight: Typography.weight.medium,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xl * 2,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    changePhotoButton: {
        marginTop: Spacing.sm,
    },
    changePhotoText: {
        fontSize: Typography.size.sm,
        color: Blue[600],
        fontWeight: Typography.weight.medium,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: Spacing.sm,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginHorizontal: 4,
        ...Shadows.sm,
    },
    statNumber: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        color: Neutral[900],
        marginTop: Spacing.xs,
    },
    statLabel: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
    },
    infoCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        color: Neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    actionsCard: {
        marginBottom: Spacing.lg,
        overflow: 'hidden',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    actionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    actionText: {
        fontSize: Typography.size.base,
        color: Neutral[800],
    },
    logoutButton: {
        marginTop: Spacing.md,
    },
    version: {
        textAlign: 'center',
        fontSize: Typography.size.sm,
        color: Neutral[400],
        marginTop: Spacing.lg,
    },
});
