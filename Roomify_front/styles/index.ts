/**
 * Common Styles for Roomify
 * Reusable style objects that complement Tailwind/NativeWind
 */

import { StyleSheet } from 'react-native';
import { Blue, Neutral, Shadows, Spacing, BorderRadius, Typography } from '../constants/theme';

// ============================================
// COMMON STYLES
// ============================================

export const CommonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerPadded: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: Spacing.base,
  },
  containerCentered: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Shadows.base,
  },
  cardLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },

  // Rows & Columns
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  columnCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Spacing
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  gap24: { gap: 24 },
});

// ============================================
// BUTTON STYLES
// ============================================

export const ButtonStyles = StyleSheet.create({
  // Primary Button (Blue)
  primary: {
    backgroundColor: Blue[600],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },

  // Secondary Button (Outlined)
  secondary: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Blue[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: Blue[600],
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },

  // Ghost Button (No background)
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: Blue[600],
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
  },

  // Danger Button (Red)
  danger: {
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {
    color: '#FFFFFF',
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },

  // Icon Button
  icon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Neutral[100],
  },
  iconSmall: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Neutral[100],
  },
});

// ============================================
// TEXT STYLES
// ============================================

export const TextStyles = StyleSheet.create({
  // Headings
  h1: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Neutral[900],
    lineHeight: Typography.size['3xl'] * Typography.lineHeight.tight,
  },
  h2: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Neutral[900],
    lineHeight: Typography.size['2xl'] * Typography.lineHeight.tight,
  },
  h3: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    color: Neutral[900],
    lineHeight: Typography.size.xl * Typography.lineHeight.tight,
  },
  h4: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Neutral[900],
    lineHeight: Typography.size.lg * Typography.lineHeight.tight,
  },

  // Body Text
  body: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.normal,
    color: Neutral[700],
    lineHeight: Typography.size.base * Typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.normal,
    color: Neutral[600],
    lineHeight: Typography.size.sm * Typography.lineHeight.normal,
  },
  bodyLarge: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.normal,
    color: Neutral[700],
    lineHeight: Typography.size.lg * Typography.lineHeight.normal,
  },

  // Caption / Helper
  caption: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.normal,
    color: Neutral[500],
    lineHeight: Typography.size.xs * Typography.lineHeight.normal,
  },

  // Labels
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Neutral[700],
    marginBottom: Spacing.xs,
  },

  // Links
  link: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Blue[600],
  },
});

// ============================================
// INPUT STYLES
// ============================================

export const InputStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  input: {
    backgroundColor: Neutral[50],
    borderWidth: 1,
    borderColor: Neutral[200],
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.size.base,
    color: Neutral[900],
  },
  inputFocused: {
    borderColor: Blue[500],
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: Typography.size.sm,
    color: '#EF4444',
    marginTop: Spacing.xs,
  },
});

// ============================================
// LIST STYLES
// ============================================

export const ListStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Neutral[100],
  },
  itemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  itemTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Neutral[900],
  },
  itemSubtitle: {
    fontSize: Typography.size.sm,
    color: Neutral[500],
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Neutral[100],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  emptyText: {
    fontSize: Typography.size.base,
    color: Neutral[400],
    textAlign: 'center',
  },
});

// ============================================
// AVATAR STYLES
// ============================================

export const AvatarStyles = StyleSheet.create({
  small: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Blue[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Blue[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Blue[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  xlarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Blue[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Blue[700],
    fontWeight: Typography.weight.semibold,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
});

// Export all
export default {
  Common: CommonStyles,
  Button: ButtonStyles,
  Text: TextStyles,
  Input: InputStyles,
  List: ListStyles,
  Avatar: AvatarStyles,
};
