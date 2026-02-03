/**
 * StripeProviderWrapper - Web
 * Uses @stripe/react-stripe-js for web payments
 */
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ReactNode } from 'react';

const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface Props {
  children: ReactNode;
}

export function StripeProviderWrapper({ children }: Props) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
