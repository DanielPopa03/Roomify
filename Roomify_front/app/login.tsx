import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View, ActivityIndicator, StyleSheet, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

export default function LoginScreen() {
  const { login, error, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  // Redirect to token-setup on mobile if error about token
  React.useEffect(() => {
    if (Platform.OS !== 'web' && error && (error.message.includes('auth token') || error.message.includes('set up mobile'))) {
      router.push('/token-setup');
    }
  }, [error]);

  const onLogin = async () => {
    try {
      await login();
    } catch (e) {
      console.log(e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Blue[600]} />
        <Text style={styles.loadingText}>Signing you in...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="home" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>Roomify</Text>
        </View>
        <Text style={styles.tagline}>Find your perfect home</Text>
        <Text style={styles.subtitle}>
          Connect with landlords, discover properties, and find the room that fits your lifestyle.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="search" size={20} color={Blue[600]} />
          </View>
          <Text style={styles.featureText}>Browse properties</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="heart" size={20} color={Blue[600]} />
          </View>
          <Text style={styles.featureText}>Express interest</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="chatbubbles" size={20} color={Blue[600]} />
          </View>
          <Text style={styles.featureText}>Chat directly</Text>
        </View>
      </View>

      {/* Login Section */}
      <View style={styles.loginSection}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onLogin}
          style={styles.loginButton}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By signing in, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.size.base,
    color: Neutral[500],
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl * 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Blue[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.lg,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: Blue[600],
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    color: Neutral[900],
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: Neutral[500],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Neutral[100],
    marginTop: Spacing.lg,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Blue[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  featureText: {
    fontSize: Typography.size.xs,
    color: Neutral[600],
    fontWeight: Typography.weight.medium,
  },
  loginSection: {
    paddingBottom: Spacing.xl * 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.size.sm,
    color: '#EF4444',
    fontWeight: Typography.weight.medium,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Blue[600],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  loginButtonText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: Typography.size.xs,
    color: Neutral[400],
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 18,
  },
  termsLink: {
    color: Blue[600],
  },
});