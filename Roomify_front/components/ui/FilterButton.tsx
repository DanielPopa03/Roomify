/**
 * FilterButton Component
 * Filter icon button for top-right corner
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, BorderRadius, Shadows, Spacing, Typography } from '../../constants/theme';

interface FilterButtonProps {
  onPress: () => void;
  activeFilters?: number;
}

export function FilterButton({ onPress, activeFilters = 0 }: FilterButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="options-outline" size={22} color={Neutral[700]} />
      {activeFilters > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeFilters}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Neutral[200],
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Blue[600],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
});

export default FilterButton;
