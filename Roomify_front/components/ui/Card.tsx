import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

export const Card = ({ children, style, elevation = 0 }: { children: React.ReactNode, style?: ViewStyle, elevation?: number }) => {
    return (
        <View style={[styles.card, elevation > 0 && Shadows.sm, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
});