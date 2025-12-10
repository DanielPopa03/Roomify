/**
 * ScreenContainer
 * Base container for all screens with consistent padding and safe area handling
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

interface ScreenContainerProps {
  children: ReactNode;
  /** Use SafeAreaView (default: true) */
  safe?: boolean;
  /** Add horizontal padding (default: true) */
  padded?: boolean;
  /** Background color variant */
  variant?: 'default' | 'secondary';
  /** Additional styles */
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  safe = true,
  padded = true,
  variant = 'default',
  style,
}: ScreenContainerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const backgroundColor =
    variant === 'secondary' ? colors.backgroundSecondary : colors.background;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    ...(padded && { paddingHorizontal: 16 }),
    ...style,
  };

  if (safe) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={containerStyle}>{children}</View>
      </SafeAreaView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});

export default ScreenContainer;
