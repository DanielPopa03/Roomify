import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Blue, Neutral } from '@/constants/theme';
import { RoleGuard } from '@/components/roleguard';

export default function LandlordLayout() {
    return (
        <RoleGuard allowedRoles={['landlord']}>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: Blue[600],
                    tabBarInactiveTintColor: Neutral[400],
                    headerShown: false,
                    tabBarButton: HapticTab,
                    tabBarStyle: Platform.select({
                        ios: {
                            position: 'absolute',
                            backgroundColor: '#FFFFFF',
                            borderTopColor: Neutral[100],
                        },
                        default: {
                            backgroundColor: '#FFFFFF',
                            borderTopColor: Neutral[100],
                        },
                    }),
                    tabBarLabelStyle: {
                        fontSize: 10,
                        fontWeight: '500',
                        marginBottom: 4
                    },
                }}>

                {/* 1. Main Home: Tenant Review (Tinder Style) */}
                {/* Uses the "two man icon" (people) as requested */}
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Review',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'people' : 'people-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* 2. Properties List */}
                <Tabs.Screen
                    name="properties"
                    options={{
                        title: 'Properties',
                        href: '/(landlord)',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'home' : 'home-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* 3. Interested Tab */}
                {/* Uses the "current review icon" (checkbox) as requested */}
                <Tabs.Screen
                    name="match"
                    options={{
                        title: 'Interested',
                        href: '/(landlord)/match',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'checkbox' : 'checkbox-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* 4. Chat Tab */}
                <Tabs.Screen
                    name="chat"
                    options={{
                        title: 'Messages',
                        href: '/(landlord)/chat',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* 5. Profile Tab */}
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        href: '/(landlord)/profile',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'person' : 'person-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* --- HIDDEN SCREENS --- */}
                {/* These are accessible via navigation but do not appear on the tab bar */}

                {/* Tenant Profile Screen - MUST be declared to prevent auto-tab creation */}
                <Tabs.Screen
                    name="tenant-profile/[id]"
                    options={{
                        href: null,
                        headerShown: false,
                        tabBarStyle: { display: 'none' }
                    }}
                />

                <Tabs.Screen
                    name="add-property"
                    options={{
                        href: null,
                        headerShown: false,
                    }}
                />
                <Tabs.Screen
                    name="edit-property"
                    options={{
                        href: null,
                        headerShown: false,
                    }}
                />

                {/* Chat Room Screen - hidden from tabs */}
                <Tabs.Screen
                    name="chat-room"
                    options={{
                        href: null,
                        headerShown: false,
                        tabBarStyle: { display: 'none' }
                    }}
                />

            </Tabs>
        </RoleGuard>
    );
}