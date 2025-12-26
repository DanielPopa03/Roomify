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
                        fontSize: 12,
                        fontWeight: '500',
                    },
                }}>

                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Properties',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'home' : 'home-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="match"
                    options={{
                        title: 'Interested',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'people' : 'people-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* --- NEW CHAT TAB --- */}
                <Tabs.Screen
                    name="chat"
                    options={{
                        title: 'Messages',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
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

                <Tabs.Screen
                    name="add-property"
                    options={{
                        href: null,
                        title: 'Add Property',
                    }}
                />
                <Tabs.Screen
                    name="edit-property"
                    options={{
                        href: null,
                        title: 'Edit Property',
                    }}
                />

                {/* New Chat Room Screen */}
                <Tabs.Screen
                    name="chat-room"
                    options={{
                        href: null,
                        title: 'Chat',
                        // Hides the tab bar when inside a specific chat conversation
                        tabBarStyle: { display: 'none' }
                    }}
                />

            </Tabs>
        </RoleGuard>
    );
}