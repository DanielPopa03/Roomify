/**
 * StripeProviderWrapper - Native (iOS/Android)
 * Uses the real Stripe React Native SDK
 */
import { StripeProvider } from '@stripe/stripe-react-native';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function StripeProviderWrapper({ children }: Props) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.roomify"
    >
      {children}
    </StripeProvider>
  );
}
