import { useAuth } from '@/context/AuthContext';
import Api from '@/services/api';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export const usePayment = () => {
    const { getAccessToken } = useAuth();
    const [loading, setLoading] = useState(false);

    const openPaymentSheet = async (leaseId: string, onSuccess?: () => void) => {
        setLoading(true);
        console.log('[usePayment.web] Starting payment for leaseId:', leaseId);

        try {
            const token = await getAccessToken();
            if (!token) throw new Error("No access token");

            // Get current URL for success/cancel redirects
            const baseUrl = window.location.origin;
            const successUrl = `${baseUrl}/(normal)/match?payment_session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${baseUrl}/(normal)/match?paymentCancelled=true`;

            console.log('[usePayment.web] Creating checkout session...');
            
            // Create Stripe Checkout Session
            const response = await Api.Payments.createCheckoutSession(
                token, 
                leaseId,
                successUrl,
                cancelUrl
            );
            
            console.log('[usePayment.web] Checkout session response:', response);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            const checkoutUrl = response.data?.url;
            
            if (!checkoutUrl) {
                throw new Error("Failed to get checkout URL from server");
            }

            console.log('[usePayment.web] Redirecting to Stripe Checkout:', checkoutUrl);

            // Redirect to Stripe Checkout
            window.location.href = checkoutUrl;

            // Note: onSuccess won't be called here since we redirect.
            // Success handling will happen on the return URL.

        } catch (error: any) {
            console.error('[usePayment.web] Payment Flow Error:', error);
            window.alert(`Error: ${error.message || 'Something went wrong'}`);
            setLoading(false);
        }
    };

    return {
        openPaymentSheet,
        loading
    };
};
