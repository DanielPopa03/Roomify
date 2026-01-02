/**
 * PropertyContextBar Component
 * Displays property context in chat - thumbnail, title, price, and action button
 * Used to show which property the conversation is about
 */

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { formatRent } from '../../utils';

interface PropertyContextBarProps {
  property: {
    id: number;
    title: string;
    price: number;
    address: string;
    imageUrl: string | null;
  } | null;
  onPress: () => void;
  loading?: boolean;
}

export function PropertyContextBar({ property, onPress, loading = false }: PropertyContextBarProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Blue[500]} />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </View>
    );
  }

  if (!property) {
    return null;
  }

  const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
  // Handle both full URLs and relative paths
  const imageUri = property.imageUrl 
    ? (property.imageUrl.startsWith('http') 
        ? property.imageUrl 
        : `http://${MY_IP}:8080${property.imageUrl}`)
    : 'https://via.placeholder.com/80x80?text=No+Image';

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Property Thumbnail */}
      <Image 
        source={{ uri: imageUri }} 
        style={styles.thumbnail} 
        resizeMode="cover"
      />

      {/* Property Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {property.title}
        </Text>
        <Text style={styles.price}>
          {formatRent(property.price)}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} color={Neutral[500]} />
          {' '}{property.address}
        </Text>
      </View>

      {/* View Details Button */}
      <View style={styles.actionContainer}>
        <Ionicons name="chevron-forward" size={20} color={Blue[500]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Neutral[200],
  },
  loadingText: {
    marginLeft: Spacing.sm,
    fontSize: Typography.size.base,
    color: Neutral[600],
    fontWeight: Typography.weight.normal,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Neutral[200],
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Neutral[900],
    marginBottom: 2,
  },
  price: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Blue[600],
    marginBottom: 2,
  },
  address: {
    fontSize: Typography.size.xs,
    color: Neutral[600],
    fontWeight: Typography.weight.normal,
  },
  actionContainer: {
    marginLeft: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
  },
});
