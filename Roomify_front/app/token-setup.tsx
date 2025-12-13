import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Blue, Neutral, Typography, Spacing } from '@/constants/theme';

export default function TokenSetupScreen() {
  const router = useRouter();
  const [token, setToken] = useState('');

  const handleSave = async () => {
    if (token.trim()) {
      await AsyncStorage.setItem('mobile_auth_token', token.trim());
      router.replace('/');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Mobile Auth Setup</Text>
        <Text style={styles.subtitle}>
          To use the mobile app with Expo Go, paste your Auth0 token from the web app:
        </Text>

        <View style={styles.steps}>
          <Text style={styles.stepTitle}>Steps:</Text>
          <Text style={styles.step}>1. Open web app (localhost:8081)</Text>
          <Text style={styles.step}>2. Open browser console (F12)</Text>
          <Text style={styles.step}>3. Run: copy(document.cookie)</Text>
          <Text style={styles.step}>4. Or check Network tab → API call → Authorization header</Text>
          <Text style={styles.step}>5. Paste the JWT token below</Text>
        </View>

        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="Paste your JWT token here (starts with eyJ...)"
          placeholderTextColor={Neutral[400]}
          multiline
          numberOfLines={8}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity 
          style={[styles.button, !token.trim() && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={!token.trim()}
        >
          <Text style={styles.buttonText}>Save & Continue</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Note: This is a temporary solution for Expo Go testing. 
          Production apps should use react-native-auth0 with a development build.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 60,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Neutral[900],
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: Neutral[600],
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  steps: {
    backgroundColor: Neutral[50],
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Neutral[900],
    marginBottom: Spacing.sm,
  },
  step: {
    fontSize: Typography.size.sm,
    color: Neutral[700],
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Neutral[300],
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.size.sm,
    color: Neutral[900],
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Blue[600],
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    backgroundColor: Neutral[300],
  },
  buttonText: {
    color: '#fff',
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  note: {
    fontSize: Typography.size.xs,
    color: Neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
