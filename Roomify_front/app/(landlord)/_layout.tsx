import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LandlordLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false, // Usually cleaner to hide tab headers if screens have their own
                tabBarButton: HapticTab,
                tabBarStyle: Platform.select({
                    ios: {
                        position: 'absolute',
                    },
                    default: {},
                }),
            }}>

            {/* 1. Main Swipe Screen */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Swipe',
                    headerShown: false, // Index has its own custom header
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
                }}
            />

            {/* 2. My Properties (New Tab) */}
            <Tabs.Screen
                name="my-properties"
                options={{
                    title: 'My Properties',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
                }}
            />

            {/* 3. Matches */}
            <Tabs.Screen
                name="match"
                options={{
                    title: 'Matches',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
                }}
            />

            {/* 4. Create Property (HIDDEN FROM TABS) */}
            <Tabs.Screen
                name="create-update-property"
                options={{
                    href: null, // This hides it from the bottom bar
                    headerShown: false,
                }}
            />

            {/* 5. Profile (HIDDEN FROM TABS - accessible via header icon) */}
            <Tabs.Screen
                name="profile"
                options={{
                    href: null,
                    headerShown: false,
                }}
            />
        </Tabs>
    );
}