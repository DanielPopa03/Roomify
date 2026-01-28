import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageGalleryModalProps {
  images: string[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  images,
  visible,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const carouselRef = useRef<ICarouselInstance>(null);

  // Reset to initial index when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [visible, initialIndex]);

  if (images.length === 0) return null;

  const handleZoomToggle = () => {
    setIsZoomed(!isZoomed);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      carouselRef.current?.scrollTo({ index: currentIndex - 1, animated: true });
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      carouselRef.current?.scrollTo({ index: currentIndex + 1, animated: true });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header with close button and counter */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        </View>

        {/* Zoom view when tapped */}
        {isZoomed ? (
          <Modal
            visible={isZoomed}
            transparent={true}
            onRequestClose={() => setIsZoomed(false)}
          >
            <View style={styles.zoomModalContainer}>
              <TouchableOpacity
                style={styles.zoomCloseButton}
                onPress={() => setIsZoomed(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={32} color="#FFFFFF" />
              </TouchableOpacity>

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: images[currentIndex] }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          </Modal>
        ) : (
          <>
            {/* Image carousel */}
            <Carousel
              ref={carouselRef}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT * 0.7}
              data={images}
              defaultIndex={initialIndex}
              onSnapToItem={(index) => setCurrentIndex(index)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleZoomToggle}
                  style={styles.carouselItem}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.carouselImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
            />

            {/* Navigation Arrows - shown when more than 1 image */}
            {images.length > 1 && (
              <>
                {/* Previous Button */}
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonLeft, currentIndex === 0 && styles.navButtonDisabled]}
                  onPress={goToPrevious}
                  disabled={currentIndex === 0}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={32} color={currentIndex === 0 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'} />
                </TouchableOpacity>

                {/* Next Button */}
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonRight, currentIndex === images.length - 1 && styles.navButtonDisabled]}
                  onPress={goToNext}
                  disabled={currentIndex === images.length - 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={32} color={currentIndex === images.length - 1 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'} />
                </TouchableOpacity>
              </>
            )}

            {/* Page indicator dots */}
            {images.length > 1 && (
              <View style={styles.dotsContainer}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Hint text */}
            <View style={styles.hintContainer}>
              <Ionicons name="hand-left-outline" size={20} color="rgba(255,255,255,0.7)" />
              <Text style={styles.hintText}>
                Swipe to browse • Tap to zoom
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  carouselItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  zoomModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
