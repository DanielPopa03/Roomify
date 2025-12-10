/**
 * TabBar Component
 * Custom bottom tab bar
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Blue, Neutral, Typography, Spacing, Shadows } from '../../constants/theme';

interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function TabBar({ tabs, activeTab, onTabPress }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || Spacing.sm }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconFocused : tab.icon}
              size={24}
              color={isActive ? Blue[600] : Neutral[400]}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Neutral[100],
    paddingTop: Spacing.sm,
    ...Shadows.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: Typography.size.xs,
    color: Neutral[400],
    marginTop: 4,
    fontWeight: Typography.weight.medium,
  },
  labelActive: {
    color: Blue[600],
    fontWeight: Typography.weight.semibold,
  },
});

export default TabBar;
