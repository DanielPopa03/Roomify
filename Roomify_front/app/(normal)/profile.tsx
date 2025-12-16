import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Input } from '@/components/ui';
import { Blue, BorderRadius, Neutral, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    
    const [fullName, setFullName] = useState(user?.name || '');
    const [bio, setBio] = useState('Looking for a cozy apartment in NYC.');
    const [phone, setPhone] = useState('+1 (555) 123-4567');
    const [isEditing, setIsEditing] = useState(false);
    
    // Mock stats
    const stats = {
        propertiesViewed: 24,
        interests: 8,
        matches: 4,
    };
    
    const handleSave = () => {
        // Here you would call the API to save profile
        console.log('Saving profile:', { fullName, bio, phone });
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
    };
    
    const handleLogout = async () => {
        await logout();
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
                {/* Profile Header Card */}
                <View style={styles.profileHeaderCard}>
                    <LinearGradient
                        colors={[Blue[500], Blue[600]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBackground}
                    />
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            <Avatar 
                                uri={user?.picture}
                                name={user?.name || 'User'}
                                size={90}
                            />
                            {isEditing && (
                                <TouchableOpacity style={styles.editAvatarButton}>
                                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.userName}>{user?.name || 'User'}</Text>
                        <Text style={styles.userEmail}>{user?.email || 'user@email.com'}</Text>
                        
                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.propertiesViewed}</Text>
                                <Text style={styles.statLabel}>Viewed</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.interests}</Text>
                                <Text style={styles.statLabel}>Interests</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.matches}</Text>
                                <Text style={styles.statLabel}>Matches</Text>
                            </View>
                        </View>
                    </View>
                </View>
                
                {/* Profile Info */}
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <Card shadow="sm" style={styles.infoCard}>
                    <Input
                        label="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                        editable={isEditing}
                        icon={<Ionicons name="person-outline" size={18} color={Neutral[400]} />}
                    />
                    
                    <Input
                        label="Email"
                        value={user?.email || ''}
                        editable={false}
                        placeholder="Email"
                        icon={<Ionicons name="mail-outline" size={18} color={Neutral[400]} />}
                    />
                    
                    <Input
                        label="Phone"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+1 (555) 000-0000"
                        keyboardType="phone-pad"
                        editable={isEditing}
                        icon={<Ionicons name="call-outline" size={18} color={Neutral[400]} />}
                    />
                    
                    <Input
                        label="About Me"
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Tell landlords about yourself..."
                        multiline
                        numberOfLines={3}
                        editable={isEditing}
                        icon={<Ionicons name="document-text-outline" size={18} color={Neutral[400]} />}
                    />
                    
                    {isEditing && (
                        <Button 
                            title="Save Changes"
                            onPress={handleSave}
                            style={{ marginTop: Spacing.md }}
                        />
                    )}
                </Card>
                
                {/* Search Preferences */}
                <Text style={styles.sectionTitle}>Search Preferences</Text>
                <Card shadow="sm" style={styles.preferencesCard}>
                    <TouchableOpacity style={styles.preferenceItem}>
                        <View style={styles.preferenceLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: Blue[50] }]}>
                                <Ionicons name="location-outline" size={18} color={Blue[600]} />
                            </View>
                            <View>
                                <Text style={styles.preferenceText}>Preferred Location</Text>
                                <Text style={styles.preferenceValue}>New York, NY</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.preferenceItem}>
                        <View style={styles.preferenceLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="cash-outline" size={18} color="#D97706" />
                            </View>
                            <View>
                                <Text style={styles.preferenceText}>Budget Range</Text>
                                <Text style={styles.preferenceValue}>$800 - $1,500/mo</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.preferenceItem, { borderBottomWidth: 0 }]}>
                        <View style={styles.preferenceLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                                <Ionicons name="home-outline" size={18} color="#16A34A" />
                            </View>
                            <View>
                                <Text style={styles.preferenceText}>Property Type</Text>
                                <Text style={styles.preferenceValue}>Apartment, Studio</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                </Card>
                
                {/* Account Settings */}
                <Text style={styles.sectionTitle}>Account</Text>
                <Card shadow="sm" style={styles.preferencesCard}>
                    <TouchableOpacity style={styles.preferenceItem}>
                        <View style={styles.preferenceLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: Neutral[100] }]}>
                                <Ionicons name="notifications-outline" size={18} color={Neutral[600]} />
                            </View>
                            <Text style={styles.preferenceText}>Notifications</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.preferenceItem} onPress={handleSwitchRole}>
                        <View style={styles.preferenceLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: Neutral[100] }]}>
                                <Ionicons name="swap-horizontal-outline" size={18} color={Neutral[600]} />
                            </View>
                            <Text style={styles.preferenceText}>Switch Role</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.preferenceItem, { borderBottomWidth: 0 }]}>
                        <View style={styles.preferenceLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: Neutral[100] }]}>
                                <Ionicons name="help-circle-outline" size={18} color={Neutral[600]} />
                            </View>
                            <Text style={styles.preferenceText}>Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                </Card>
                
                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
                
                <Text style={styles.version}>Roomify v1.0.0</Text>
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
        paddingBottom: Spacing.xl * 2,
    },
    profileHeaderCard: {
        position: 'relative',
        marginBottom: Spacing.lg,
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    avatarSection: {
        alignItems: 'center',
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    avatarWrapper: {
        position: 'relative',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Blue[600],
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    userName: {
        marginTop: Spacing.md,
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        color: Neutral[900],
    },
    userEmail: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
        backgroundColor: '#FFFFFF',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        color: Blue[600],
    },
    statLabel: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: Neutral[200],
    },
    infoCard: {
        padding: Spacing.lg,
        marginHorizontal: Spacing.base,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        color: Neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.lg,
    },
    preferencesCard: {
        marginHorizontal: Spacing.base,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    preferenceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    preferenceText: {
        fontSize: Typography.size.base,
        color: Neutral[800],
        fontWeight: Typography.weight.medium,
    },
    preferenceValue: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#FEE2E2',
    },
    logoutText: {
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
        color: '#EF4444',
    },
    version: {
        textAlign: 'center',
        fontSize: Typography.size.sm,
        color: Neutral[400],
        marginTop: Spacing.lg,
    },
});
