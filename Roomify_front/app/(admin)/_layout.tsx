import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Blue, Neutral } from '@/constants/theme';
import { RoleGuard } from '@/components/roleguard';

export default function AdminLayout() {
    return (
        <RoleGuard allowedRoles={['admin']}>
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
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons 
                            name={focused ? 'grid' : 'grid-outline'} 
                            size={24} 
                            color={color} 
                        />
                    ),
                }}
            />
            
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Reports',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons 
                            name={focused ? 'flag' : 'flag-outline'} 
                            size={24} 
                            color={color} 
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="roles"
                options={{
                    title: 'Users',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons 
                            name={focused ? 'people' : 'people-outline'} 
                            size={24} 
                            color={color} 
                        />
                    ),
                }}
            />
            </Tabs>
        </RoleGuard>
        
    );
}
