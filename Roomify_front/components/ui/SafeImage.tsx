import React, { useState } from 'react';
import { Image, View, ImageProps, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SafeImageProps extends ImageProps {
  className?: string;
}

export const SafeImage = ({ style, className, ...props }: SafeImageProps) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View 
        className={`bg-gray-200 items-center justify-center ${className || ''}`} 
        style={[style as StyleProp<ViewStyle>, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <Image
      {...props}
      style={style as StyleProp<ImageStyle>}
      onError={() => setError(true)}
      className={className}
    />
  );
}

export default SafeImage;
