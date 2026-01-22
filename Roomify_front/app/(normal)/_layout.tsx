import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Blue, Neutral, Typography, Spacing, Shadows } from '@/constants/theme';
import { RoleGuard } from '@/components/roleguard';
import { useAuth } from '@/context/AuthContext';

// --- UNIFIED CENTERED HEADER ---
const CustomHeader = ({ title = "Roomify", showProfileButton = true }: { title?: string, showProfileButton?: boolean }) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();

    // Check if it's the main brand title to apply special styling
    const isBrand = title === 'Roomify';

    return (
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
            <View style={styles.headerContent}>

                {/* 1. Centered Title (Absolute Positioned) */}
                <View style={styles.titleWrapper}>
                    <Text style={[
                        styles.headerTitle,
                        isBrand && styles.brandTitle // Apply Blue/Logo style if it's Roomify
                    ]}>
                        {title}
                    </Text>
                </View>

                {/* 2. Right Side Action (Profile Button) */}
                {showProfileButton && (
                    <TouchableOpacity
                        onPress={() => router.push('/(normal)/profile')}
                        style={styles.rightButton}
                    >
                        {user?.photoURL ? (
                            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {user?.email?.[0]?.toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function NormalLayout() {
    return (
        <RoleGuard allowedRoles={['user']}>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: Blue[600],
                    tabBarInactiveTintColor: Neutral[400],
                    headerShown: true, // Header is now ON for all screens by default
                    tabBarButton: HapticTab,
                    tabBarStyle: Platform.select({
                        ios: {
                            position: 'absolute',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderTopColor: Neutral[200],
                            elevation: 0,
                        },
                        default: {
                            backgroundColor: '#FFFFFF',
                            borderTopColor: Neutral[200],
                            height: 60,
                            paddingBottom: 8,
                        },
                    }),
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: '600',
                        marginBottom: Platform.OS === 'android' ? 4 : 0,
                    },
                }}>

                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Browse',
                        // Title is explicitly "Roomify"
                        header: () => <CustomHeader title="Roomify" showProfileButton={true} />,
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="match"
                    options={{
                        title: 'Matches',
                        // Title is now "Roomify" here too
                        header: () => <CustomHeader title="Roomify" showProfileButton={true} />,
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        // I kept showProfileButton={false} because you are already ON the profile page.
                        header: () => <CustomHeader title="Roomify" showProfileButton={false} />,
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
                        ),
                    }}
                />

                {/* --- HIDDEN CHAT ROOM SCREEN --- */}
                <Tabs.Screen
                    name="chat-room"
                    options={{
                        href: null, // Hides from the bottom tab bar
                        title: 'Chat',
                        headerShown: false, // We use the custom header inside chat-room.tsx
                        tabBarStyle: { display: 'none' } // Hides the tab bar while chatting
                    }}
                />

                {/* --- HIDDEN INTERVIEW/EXPRESS PROFILE SCREENS --- */}
                <Tabs.Screen
                    name="interview"
                    options={{
                        href: null, // Hides from the bottom tab bar - only accessible via push
                        headerShown: false, // Interview screens have their own headers
                        tabBarStyle: { display: 'none' } // Hide tab bar during video recording
                    }}
                />

            </Tabs>
        </RoleGuard>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
        paddingBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        ...Shadows.sm,
        zIndex: 10,
    },
    headerContent: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
    },
    titleWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    headerTitle: {
        fontSize: Typography.size.lg,
        fontWeight: 'bold',
        color: Neutral[900],
    },
    brandTitle: {
        color: Blue[600],
        fontSize: 22,
        letterSpacing: -0.5,
    },
    rightButton: {
        padding: 4,
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: Neutral[200],
    },
    avatarPlaceholder: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Blue[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: Blue[700],
        fontWeight: 'bold',
        fontSize: 12,
    },
});