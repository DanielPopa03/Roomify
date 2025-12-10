/**
 * Avatar Component
 * Profile picture circle with fallback initials
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Blue, Neutral, Typography } from '../../constants/theme';
import { getInitials } from '../../utils';

type AvatarSizePreset = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string | null;
  source?: string | null; // Alias for uri
  name?: string;
  size?: AvatarSizePreset | number;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const fontSizeMap = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
};

export function Avatar({ uri, source, name, size = 'md' }: AvatarProps) {
  // Support both uri and source props
  const imageSource = uri || source;
  
  // Handle both preset strings and numeric sizes
  const dimension = typeof size === 'number' ? size : sizeMap[size];
  const fontSize = typeof size === 'number' 
    ? Math.round(size * 0.35) 
    : fontSizeMap[size];
  
  const initials = getInitials(name || '');

  const containerStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
  };

  if (imageSource) {
    return (
      <Image
        source={{ uri: imageSource }}
        style={[styles.image, containerStyle]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, containerStyle]}>
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Neutral[200],
  },
  placeholder: {
    backgroundColor: Blue[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Blue[700],
    fontWeight: Typography.weight.semibold,
  },
});

export default Avatar;
