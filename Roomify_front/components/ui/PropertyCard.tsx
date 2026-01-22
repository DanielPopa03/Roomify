import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { formatRent } from '../../utils';
import { SafeImage } from './SafeImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

interface PropertyCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  location: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

export function PropertyCard({
  title,
  description,
  price,
  images,
  location,
  bedrooms,
  bathrooms,
  area,
}: PropertyCardProps) {
  const imageUri = images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';

  return (
    <View style={styles.container}>
      {/* Property Image */}
      <SafeImage 
        source={{ uri: imageUri }} 
        style={styles.image} 
        resizeMode="cover" 
      />
      
      {/* Price Badge */}
      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>{formatRent(price)}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        
        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={Neutral[500]} />
          <Text style={styles.location} numberOfLines={1}>{location}</Text>
        </View>

        {/* Features */}
        {(bedrooms || bathrooms || area) ? (
          <View style={styles.featuresRow}>
            {bedrooms && (
              <View style={styles.feature}>
                <Ionicons name="bed-outline" size={18} color={Blue[600]} />
                <Text style={styles.featureText}>{bedrooms}</Text>
              </View>
            )}
            {bathrooms && (
              <View style={styles.feature}>
                <Ionicons name="water-outline" size={18} color={Blue[600]} />
                <Text style={styles.featureText}>{bathrooms}</Text>
              </View>
            )}
            {area && (
              <View style={styles.feature}>
                <Ionicons name="resize-outline" size={18} color={Blue[600]} />
                <Text style={styles.featureText}>{area} m²</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  image: {
    width: '100%',
    height: '55%',
    backgroundColor: Neutral[200],
  },
  priceBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Blue[600],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.base,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Neutral[900],
    marginBottom: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  location: {
    fontSize: Typography.size.sm,
    color: Neutral[500],
    flex: 1,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: Typography.size.sm,
    color: Neutral[700],
    fontWeight: Typography.weight.medium,
  },
  description: {
    fontSize: Typography.size.sm,
    color: Neutral[600],
    lineHeight: Typography.size.sm * 1.5,
  },
});

export default PropertyCard;
