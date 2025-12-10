/**
 * ConversationItem Component
 * List item for match/chat conversations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Neutral, Blue, Typography, Spacing } from '../../constants/theme';
import { formatRelativeTime, truncate } from '../../utils';
import Avatar from './Avatar';

interface ConversationItemProps {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  propertyTitle?: string;
  onPress: () => void;
}

export function ConversationItem({
  name,
  avatar,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  propertyTitle,
  onPress,
}: ConversationItemProps) {
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <Avatar source={avatar} name={name} size="lg" />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
            {name}
          </Text>
          {lastMessageTime && (
            <Text style={styles.time}>{formatRelativeTime(lastMessageTime)}</Text>
          )}
        </View>

        {propertyTitle && (
          <Text style={styles.propertyTitle} numberOfLines={1}>
            🏠 {propertyTitle}
          </Text>
        )}

        {lastMessage && (
          <Text 
            style={[styles.message, hasUnread && styles.messageUnread]} 
            numberOfLines={1}
          >
            {truncate(lastMessage, 50)}
          </Text>
        )}
      </View>

      {/* Unread badge */}
      {hasUnread && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Neutral[100],
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Neutral[900],
    flex: 1,
  },
  nameUnread: {
    fontWeight: Typography.weight.bold,
  },
  time: {
    fontSize: Typography.size.xs,
    color: Neutral[400],
    marginLeft: Spacing.sm,
  },
  propertyTitle: {
    fontSize: Typography.size.xs,
    color: Blue[600],
    marginBottom: 2,
  },
  message: {
    fontSize: Typography.size.sm,
    color: Neutral[500],
  },
  messageUnread: {
    color: Neutral[700],
    fontWeight: Typography.weight.medium,
  },
  badge: {
    backgroundColor: Blue[600],
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
});

export default ConversationItem;
