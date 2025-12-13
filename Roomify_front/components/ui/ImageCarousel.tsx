import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Text } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import ImageView from 'react-native-image-viewing';
import { Neutral, BorderRadius } from '@/constants/theme';

interface ImageCarouselProps {
  images: string[];
  height?: number;
  showPageIndicator?: boolean;
  enableZoom?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = 200,
  showPageIndicator = true,
  enableZoom = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewerVisible, setIsViewerVisible] = useState(false);

  // Filter out empty/null images
  const validImages = images.filter(img => img && img.trim() !== '');

  // If no images, show placeholder
  if (validImages.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>No images</Text>
      </View>
    );
  }

  // If single image, render without carousel
  if (validImages.length === 1) {
    return (
      <TouchableOpacity
        activeOpacity={enableZoom ? 0.8 : 1}
        onPress={() => enableZoom && setIsViewerVisible(true)}
        style={{ height }}
      >
        <Image
          source={{ uri: validImages[0] }}
          style={[styles.image, { height }]}
          resizeMode="cover"
        />
        {enableZoom && (
          <ImageView
            images={validImages.map(uri => ({ uri }))}
            imageIndex={0}
            visible={isViewerVisible}
            onRequestClose={() => setIsViewerVisible(false)}
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ height }}>
      <Carousel
        loop={false}
        width={SCREEN_WIDTH}
        height={height}
        data={validImages}
        scrollAnimationDuration={300}
        onSnapToItem={(index) => setCurrentIndex(index)}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={enableZoom ? 0.8 : 1}
            onPress={() => enableZoom && setIsViewerVisible(true)}
            style={styles.carouselItem}
          >
            <Image
              source={{ uri: item }}
              style={[styles.image, { height }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />

      {/* Page Indicator */}
      {showPageIndicator && validImages.length > 1 && (
        <View style={styles.indicatorContainer}>
          {validImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Image counter */}
      {validImages.length > 1 && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {validImages.length}
          </Text>
        </View>
      )}

      {/* Full-screen image viewer */}
      {enableZoom && (
        <ImageView
          images={validImages.map(uri => ({ uri }))}
          imageIndex={currentIndex}
          visible={isViewerVisible}
          onRequestClose={() => setIsViewerVisible(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  carouselItem: {
    flex: 1,
  },
  image: {
    width: '100%',
    backgroundColor: Neutral[100],
  },
  placeholder: {
    width: '100%',
    backgroundColor: Neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: Neutral[400],
    fontSize: 14,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  counterContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
