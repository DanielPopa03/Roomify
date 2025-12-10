/**
 * EmptyState Component
 * Placeholder for empty lists and screens
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Neutral, Blue, Typography, Spacing } from '../../constants/theme';
import Button from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color={Neutral[300]} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Neutral[800],
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.size.base,
    color: Neutral[500],
    textAlign: 'center',
    lineHeight: Typography.size.base * 1.5,
    maxWidth: 280,
  },
  button: {
    marginTop: Spacing.lg,
  },
});

export default EmptyState;
