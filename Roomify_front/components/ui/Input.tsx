/**
 * Input Component
 * Enhanced input with Paper styling and better mobile keyboard handling
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: InputProps) {
  return (
    <View style={styles.container}>
      <PaperInput
        label={label}
        mode="outlined"
        error={!!error}
        left={leftIcon ? <PaperInput.Icon icon={leftIcon as any} /> : undefined}
        right={rightIcon ? (
          <PaperInput.Icon 
            icon={rightIcon as any} 
            onPress={onRightIconPress}
            forceTextInputFocus={false}
          />
        ) : undefined}
        outlineColor={Neutral[200]}
        activeOutlineColor={Blue[600]}
        textColor={Neutral[900]}
        placeholderTextColor={Neutral[400]}
        style={[styles.input, style]}
        theme={{
          colors: {
            primary: Blue[600],
            error: '#EF4444',
            background: Neutral[50],
          },
          roundness: BorderRadius.base,
        }}
        {...props}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  input: {
    fontSize: Typography.size.base,
    backgroundColor: 'transparent',
  },
  error: {
    fontSize: Typography.size.sm,
    color: '#EF4444',
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  hint: {
    fontSize: Typography.size.sm,
    color: Neutral[500],
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

export default Input;
