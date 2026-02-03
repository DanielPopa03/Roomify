package com.roomify.service;

import com.roomify.model.LeaseAgreement;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class StripeService {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    /**
     * Create a PaymentIntent for the lease amount.
     * Converts BigDecimal amount to cents (e.g. 500.00 -> 50000).
     */
    public String createPaymentIntent(LeaseAgreement lease) throws StripeException {
        // Convert monthlyPrice to cents
        long amountInCents = lease.getMonthlyPrice().multiply(BigDecimal.valueOf(100)).longValue();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(lease.getCurrency().name().toLowerCase())
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build())
                .putMetadata("leaseId", lease.getId().toString())
                .putMetadata("matchId", lease.getMatch().getId().toString())
                .putMetadata("tenantId", lease.getMatch().getTenant().getId())
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);
        return paymentIntent.getClientSecret();
    }

    /**
     * Create a Stripe Checkout Session for web payments.
     * Returns the checkout session URL for redirect.
     */
    public Session createCheckoutSession(LeaseAgreement lease, String successUrl, String cancelUrl) throws StripeException {
        long amountInCents = lease.getMonthlyPrice().multiply(BigDecimal.valueOf(100)).longValue();

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency(lease.getCurrency().name().toLowerCase())
                                                .setUnitAmount(amountInCents)
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName("Rent Payment - " + lease.getMatch().getProperty().getTitle())
                                                                .setDescription("First month rent for lease agreement")
                                                                .build())
                                                .build())
                                .build())
                .putMetadata("leaseId", lease.getId().toString())
                .putMetadata("matchId", lease.getMatch().getId().toString())
                .putMetadata("tenantId", lease.getMatch().getTenant().getId())
                .build();

        return Session.create(params);
    }

    /**
     * Verify that the PaymentIntent was successful.
     */
    public boolean verifyPayment(String paymentIntentId) throws StripeException {
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
        return "succeeded".equals(paymentIntent.getStatus());
    }

    /**
     * Verify a Checkout Session and retrieve its associated PaymentIntent.
     * Returns the Session with payment details if successful.
     */
    public Session verifyCheckoutSession(String sessionId) throws StripeException {
        Stripe.apiKey = stripeApiKey;
        return Session.retrieve(sessionId);
    }

    /**
     * Get the PaymentIntent ID from a Checkout Session and verify it succeeded.
     */
    public boolean verifyCheckoutSessionPayment(String sessionId) throws StripeException {
        Stripe.apiKey = stripeApiKey;
        Session session = Session.retrieve(sessionId);
        
        // Check if payment was successful via the session status
        if ("complete".equals(session.getStatus()) && "paid".equals(session.getPaymentStatus())) {
            return true;
        }
        
        // Alternatively, verify via the PaymentIntent
        String paymentIntentId = session.getPaymentIntent();
        if (paymentIntentId != null) {
            return verifyPayment(paymentIntentId);
        }
        
        return false;
    }

    /**
     * Get metadata (leaseId) from a Checkout Session.
     */
    public Long getLeaseIdFromSession(String sessionId) throws StripeException {
        Stripe.apiKey = stripeApiKey;
        Session session = Session.retrieve(sessionId);
        String leaseIdStr = session.getMetadata().get("leaseId");
        return leaseIdStr != null ? Long.parseLong(leaseIdStr) : null;
    }
}
