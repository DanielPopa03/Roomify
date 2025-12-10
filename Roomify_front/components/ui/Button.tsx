/**
 * Button Component
 * Enhanced button with Paper ripple effects and better mobile UX
 */

import React from 'react';
import { Text, View, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Platform } from 'react-native';
import { TouchableRipple } from 'react-native-paper';
import { Blue, Neutral, BorderRadius, Typography, Spacing } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    isDisabled && styles.textDisabled,
    textStyle,
  ];

  const getRippleColor = () => {
    if (variant === 'primary' || variant === 'danger') return 'rgba(255, 255, 255, 0.3)';
    return `rgba(37, 99, 235, 0.2)`;
  };

  return (
    <TouchableRipple
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      rippleColor={getRippleColor()}
      borderless={false}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' || variant === 'danger' ? '#fff' : Blue[600]} 
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            <Text style={textStyles}>{title}</Text>
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Variants
  primary: {
    backgroundColor: Blue[600],
  },
  secondary: {
    backgroundColor: Blue[50],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Blue[600],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#EF4444',
  },

  // Sizes
  size_sm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 44,
  },
  size_lg: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    minHeight: 52,
  },

  fullWidth: {
    width: '100%',
  },

  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: Typography.weight.semibold,
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: Blue[700],
  },
  text_outline: {
    color: Blue[600],
  },
  text_ghost: {
    color: Blue[600],
  },
  text_danger: {
    color: '#FFFFFF',
  },

  // Text sizes
  text_sm: {
    fontSize: Typography.size.sm,
  },
  text_md: {
    fontSize: Typography.size.base,
  },
  text_lg: {
    fontSize: Typography.size.lg,
  },

  textDisabled: {
    opacity: 0.7,
  },
});

export default Button;
