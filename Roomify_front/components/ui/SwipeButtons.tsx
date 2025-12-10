/**
 * SwipeButtons Component
 * Enhanced swipe buttons with Paper ripple effects
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface SwipeButtonsProps {
  onInterested: () => void;
  onNotInterested: () => void;
  disabled?: boolean;
}

export function SwipeButtons({ 
  onInterested, 
  onNotInterested, 
  disabled = false 
}: SwipeButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Not Interested Button */}
      <View style={styles.buttonWrapper}>
        <IconButton
          icon="close"
          iconColor="#EF4444"
          size={32}
          mode="contained-tonal"
          containerColor="#FEE2E2"
          onPress={onNotInterested}
          disabled={disabled}
          style={styles.iconButton}
        />
        <Text style={styles.notInterestedText}>Pass</Text>
      </View>

      {/* Interested Button */}
      <View style={styles.buttonWrapper}>
        <IconButton
          icon="heart"
          iconColor="#FFFFFF"
          size={32}
          mode="contained"
          containerColor={Blue[600]}
          onPress={onInterested}
          disabled={disabled}
          style={styles.iconButton}
        />
        <Text style={styles.interestedText}>Like</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  buttonWrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconButton: {
    ...Shadows.md,
  },
  notInterestedText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Neutral[600],
  },
  interestedText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Blue[700],
  },
});

export default SwipeButtons;
