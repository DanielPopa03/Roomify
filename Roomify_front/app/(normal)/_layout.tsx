import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Blue, Neutral } from '@/constants/theme';

export default function NormalLayout() {
    return (
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
                    title: 'Browse',
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
                    title: 'Matches',
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
        </Tabs>
    );
}