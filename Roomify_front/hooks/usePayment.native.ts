import { useAuth } from '@/context/AuthContext';
import Api from '@/services/api';
import { useStripe } from '@stripe/stripe-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';

export const usePayment = () => {
    const { getAccessToken } = useAuth();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);

    const openPaymentSheet = async (leaseId: string, onSuccess?: () => void) => {
        setLoading(true);

        try {
            const token = await getAccessToken();
            if (!token) throw new Error("No access token");

            // 1. Fetch Payment Intent from Backend
            const response = await Api.Payments.initiatePayment(token, leaseId);
            const clientSecret = response.data?.clientSecret;

            if (!clientSecret) throw new Error("Failed to get client secret");

            // 2. Initialize Stripe Sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Roomify',
                returnURL: 'roomify://payment-complete', // Optional but good for deep linking
            });

            if (initError) {
                Alert.alert('Payment Error', initError.message);
                setLoading(false);
                return;
            }

            // 3. Present the Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code === 'Canceled') {
                    // User cancelled, just stop loading
                    console.log('User cancelled payment');
                } else {
                    Alert.alert('Payment Failed', paymentError.message);
                }
                setLoading(false);
            } else {
                // 4. Success! Confirm with Backend
                await Api.Payments.confirmPayment(token, leaseId, clientSecret);
                
                Alert.alert('Success', 'Payment confirmed! Lease is now active.');
                setLoading(false);
                if (onSuccess) onSuccess();
            }

        } catch (error: any) {
            console.error('Payment Flow Error:', error);
            Alert.alert('Error', error.message || 'Something went wrong');
            setLoading(false);
        }
    };

    return {
        openPaymentSheet,
        loading
    };
};
