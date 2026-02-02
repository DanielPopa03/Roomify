import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Blue, Neutral, Spacing, Typography, BorderRadius } from '@/constants/theme';

export default function BannedScreen() {
    const insets = useSafeAreaInsets();
    const { logout } = useAuth();

    const handleContactSupport = () => {
        Linking.openURL('mailto:support@roomify.com?subject=Account Appeal');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="ban" size={64} color="#EF4444" />
                </View>

                <Text style={styles.title}>Account Suspended</Text>

                <Text style={styles.message}>
                    Your account has been suspended due to a violation of our community guidelines.
                    You can no longer access Roomify features.
                </Text>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color={Neutral[500]} />
                    <Text style={styles.infoText}>
                        If you believe this is a mistake, please contact our support team.
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
                    <Text style={styles.contactButtonText}>Contact Support</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: Spacing.xl,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Neutral[900],
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    message: {
        fontSize: Typography.size.base,
        color: Neutral[600],
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 24,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Neutral[50],
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.size.sm,
        color: Neutral[500],
        lineHeight: 20,
    },
    footer: {
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    contactButton: {
        backgroundColor: Blue[600],
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    contactButtonText: {
        color: '#FFFFFF',
        fontSize: Typography.size.base,
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: 'transparent',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Neutral[200],
    },
    logoutButtonText: {
        color: Neutral[700],
        fontSize: Typography.size.base,
        fontWeight: '600',
    },
});