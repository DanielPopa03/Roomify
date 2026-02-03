/**
 * SystemMessage Component
 * Displays system messages (e.g., "Viewing Confirmed") as centered gray text.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Neutral, Typography, Spacing } from '@/constants/theme';

interface SystemMessageProps {
    text: string;
    timestamp?: string;
}

export function SystemMessage({ text, timestamp }: SystemMessageProps) {
    return (
        <View style={styles.container}>
            <View style={styles.bubble}>
                <Text style={styles.text}>{text}</Text>
                {timestamp && <Text style={styles.time}>{timestamp}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: Spacing.md,
    },
    bubble: {
        backgroundColor: Neutral[100],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 12,
        maxWidth: '80%',
    },
    text: {
        fontSize: Typography.size.sm,
        color: Neutral[600],
        textAlign: 'center',
    },
    time: {
        fontSize: Typography.size.xs,
        color: Neutral[400],
        textAlign: 'center',
        marginTop: 4,
    },
});
