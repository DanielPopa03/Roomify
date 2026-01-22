import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Blue, Neutral, BorderRadius, Typography, Spacing } from '@/constants/theme';

interface LifestyleBadgesProps {
    smokerFriendly?: boolean;
    petFriendly?: boolean;
    compact?: boolean;
}

/**
 * Reusable component displaying lifestyle preference badges.
 * Used in both tenant profile view (for landlords) and user's own profile.
 */
export function LifestyleBadges({ smokerFriendly = false, petFriendly = false, compact = false }: LifestyleBadgesProps) {
    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <View style={styles.badgeItem}>
                <View style={[styles.badge, smokerFriendly ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.emoji}>{smokerFriendly ? '🚬' : '🚭'}</Text>
                </View>
                <Text style={styles.label}>
                    {smokerFriendly ? 'Smoker OK' : 'Non-Smoking'}
                </Text>
            </View>
            
            <View style={styles.badgeItem}>
                <View style={[styles.badge, petFriendly ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.emoji}>{petFriendly ? '🐾' : '🚫'}</Text>
                </View>
                <Text style={styles.label}>
                    {petFriendly ? 'Pet Friendly' : 'No Pets'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    containerCompact: {
        paddingVertical: Spacing.sm,
        justifyContent: 'flex-start',
        gap: Spacing.lg,
    },
    badgeItem: {
        alignItems: 'center',
        flex: 1,
    },
    badge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeActive: {
        backgroundColor: Blue[50],
        borderWidth: 2,
        borderColor: Blue[200],
    },
    badgeInactive: {
        backgroundColor: Neutral[100],
        borderWidth: 2,
        borderColor: Neutral[200],
    },
    emoji: {
        fontSize: 24,
    },
    label: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium as any,
        color: Neutral[700],
        textAlign: 'center',
    },
});

export default LifestyleBadges;
