/**
 * Header Component
 * Top bar with profile button (left) and optional action (right)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, Typography, Spacing } from '../../constants/theme';
import Avatar from './Avatar';
import type { AuthUser } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  showProfile?: boolean;
  user?: AuthUser | null;
  onProfilePress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightAction?: React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export function Header({
  title,
  showProfile = true,
  user,
  onProfilePress,
  rightIcon,
  onRightPress,
  rightAction,
  showBackButton = false,
  onBackPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.content}>
        {/* Left side - Back button or empty */}
        <View style={styles.leftSection}>
          {showBackButton && onBackPress ? (
            <TouchableOpacity style={styles.iconButton} onPress={onBackPress}>
              <Ionicons name="chevron-back" size={24} color={Neutral[800]} />
            </TouchableOpacity>
          ) : rightIcon && onRightPress ? (
            <TouchableOpacity style={styles.iconButton} onPress={onRightPress}>
              <Ionicons name={rightIcon} size={24} color={Neutral[800]} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Center - Title */}
        {title && (
          <View style={styles.centerSection}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
        )}

        {/* Right side - Custom action, Profile, or placeholder */}
        <View style={styles.rightSection}>
          {rightAction ? (
            rightAction
          ) : showProfile && user ? (
            <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
              <Avatar source={user.picture} name={user.name || user.email} size="sm" />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Neutral[100],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    minHeight: 44,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  profileButton: {
    padding: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Neutral[900],
  },
});

export default Header;
