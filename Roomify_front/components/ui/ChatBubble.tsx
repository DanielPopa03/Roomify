/**
 * ChatBubble Component
 * Message bubble for chat screen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { formatMessageTime } from '../../utils';

interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isOwn: boolean;
  showTime?: boolean;
}

export function ChatBubble({ 
  message, 
  timestamp, 
  isOwn, 
  showTime = true 
}: ChatBubbleProps) {
  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.message, isOwn ? styles.ownMessage : styles.otherMessage]}>
          {message}
        </Text>
      </View>
      {showTime && (
        <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
          {formatMessageTime(timestamp)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.base,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  ownBubble: {
    backgroundColor: Blue[600],
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Neutral[100],
    borderBottomLeftRadius: 4,
  },
  message: {
    fontSize: Typography.size.base,
    lineHeight: Typography.size.base * 1.4,
  },
  ownMessage: {
    color: '#FFFFFF',
  },
  otherMessage: {
    color: Neutral[900],
  },
  time: {
    fontSize: Typography.size.xs,
    marginTop: 4,
  },
  ownTime: {
    color: Neutral[400],
    textAlign: 'right',
  },
  otherTime: {
    color: Neutral[400],
    textAlign: 'left',
  },
});

export default ChatBubble;
