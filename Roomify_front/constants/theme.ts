/**
 * Roomify Theme Configuration
 * Airbnb-inspired, minimalist design with blue as dominant color
 * Target audience: older landlords → professional, clean, readable
 */

import { Platform } from 'react-native';

// ============================================
// COLOR PALETTE
// ============================================

// Primary Blue Palette (Dominant)
export const Blue = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6', // Primary
  600: '#2563EB', // Primary Dark
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
};

// Neutral Palette (Supporting)
export const Neutral = {
  50: '#FAFAFA',
  100: '#F4F4F5',
  200: '#E4E4E7',
  300: '#D4D4D8',
  400: '#A1A1AA',
  500: '#71717A',
  600: '#52525B',
  700: '#3F3F46',
  800: '#27272A',
  900: '#18181B',
};

// Semantic Colors
export const Semantic = {
  success: '#22C55E',
  successLight: '#DCFCE7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
};

// Theme Colors (Light/Dark Mode)
const tintColorLight = Blue[600];
const tintColorDark = Blue[400];

export const Colors = {
  light: {
    text: Neutral[900],
    textSecondary: Neutral[600],
    textMuted: Neutral[400],
    background: '#FFFFFF',
    backgroundSecondary: Neutral[50],
    tint: tintColorLight,
    icon: Neutral[500],
    tabIconDefault: Neutral[400],
    tabIconSelected: tintColorLight,
    border: Neutral[200],
    card: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
    primary: Blue[600],
    primaryLight: Blue[100],
  },
  dark: {
    text: Neutral[50],
    textSecondary: Neutral[300],
    textMuted: Neutral[500],
    background: Neutral[900],
    backgroundSecondary: Neutral[800],
    tint: tintColorDark,
    icon: Neutral[400],
    tabIconDefault: Neutral[500],
    tabIconSelected: tintColorDark,
    border: Neutral[700],
    card: Neutral[800],
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    primary: Blue[500],
    primaryLight: Blue[900],
  },
};

// ============================================
// TYPOGRAPHY
// ============================================

export const Typography = {
  // Font Sizes
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  // Font Weights
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ============================================
// SPACING
// ============================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

// ============================================
// BORDER RADIUS
// ============================================

export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 28,
  full: 9999,
};

// ============================================
// SHADOWS
// ============================================

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
