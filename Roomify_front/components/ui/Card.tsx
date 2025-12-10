/**
 * Card Component
 * Enhanced card with Paper elevation and better press effects
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Surface, TouchableRipple } from 'react-native-paper';
import { Shadows, BorderRadius, Spacing, Neutral } from '../../constants/theme';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'default',
  elevation = 2,
  padding = 'none',
  onPress,
  style,
}: CardProps) {
  const cardStyles = [
    styles.base,
    padding !== 'none' && styles[`padding_${padding}`],
    variant === 'outlined' && styles.outlined,
    style,
  ];

  if (onPress) {
    return (
      <Surface elevation={elevation} style={cardStyles}>
        <TouchableRipple 
          onPress={onPress} 
          rippleColor="rgba(37, 99, 235, 0.1)"
          borderless={false}
          style={styles.ripple}
        >
          <View style={styles.content}>{children}</View>
        </TouchableRipple>
      </Surface>
    );
  }

  return (
    <Surface elevation={elevation} style={cardStyles}>
      <View style={styles.content}>{children}</View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  outlined: {
    borderWidth: 1,
    borderColor: Neutral[200],
  },
  ripple: {
    borderRadius: BorderRadius.md,
  },
  content: {
    width: '100%',
  },
  // Padding
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: Spacing.sm,
  },
  padding_md: {
    padding: Spacing.base,
  },
  padding_lg: {
    padding: Spacing.lg,
  },
});

export default Card;
