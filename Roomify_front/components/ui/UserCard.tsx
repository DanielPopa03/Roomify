/**
 * UserCard Component
 * Card showing interested user info (for landlords)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Avatar from './Avatar';
import Button from './Button';

interface UserCardProps {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  propertyTitle?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function UserCard({
  name,
  email,
  avatar,
  bio,
  propertyTitle,
  onAccept,
  onDecline,
}: UserCardProps) {
  return (
    <View style={styles.container}>
      {/* Property Reference */}
      {propertyTitle && (
        <View style={styles.propertyBadge}>
          <Ionicons name="home-outline" size={14} color={Blue[600]} />
          <Text style={styles.propertyText} numberOfLines={1}>{propertyTitle}</Text>
        </View>
      )}

      {/* User Info */}
      <View style={styles.userSection}>
        <Avatar source={avatar} name={name} size="xl" />
        <View style={styles.userInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>

      {/* Bio */}
      {bio && (
        <Text style={styles.bio} numberOfLines={3}>{bio}</Text>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Decline"
          onPress={onDecline}
          variant="outline"
          size="md"
          style={styles.actionButton}
        />
        <Button
          title="Accept"
          onPress={onAccept}
          variant="primary"
          size="md"
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Blue[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  propertyText: {
    fontSize: Typography.size.sm,
    color: Blue[700],
    fontWeight: Typography.weight.medium,
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  name: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Neutral[900],
    marginBottom: 4,
  },
  email: {
    fontSize: Typography.size.sm,
    color: Neutral[500],
  },
  bio: {
    fontSize: Typography.size.base,
    color: Neutral[600],
    lineHeight: Typography.size.base * 1.5,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

export default UserCard;
