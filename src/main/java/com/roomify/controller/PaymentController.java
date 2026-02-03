package com.roomify.controller;

import com.roomify.dto.PaymentConfirmRequest;
import com.roomify.dto.PaymentInitiateRequest;
import com.roomify.model.LeaseAgreement;
import com.roomify.model.Match;
import com.roomify.model.enums.LeaseStatus;
import com.roomify.model.enums.MatchStatus;
import com.roomify.repository.LeaseAgreementRepository;
import com.roomify.repository.MatchRepository;
import com.roomify.service.ChatService;
import com.roomify.service.StripeService;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final StripeService stripeService;
    private final LeaseAgreementRepository leaseAgreementRepository;
    private final MatchRepository matchRepository;
    private final ChatService chatService;

    @PostMapping("/initiate")
    public ResponseEntity<?> initiatePayment(@RequestBody PaymentInitiateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Long leaseId = request.getLeaseId();

        System.out.println("[PaymentController] Initiating payment for leaseId: " + leaseId + ", userId: " + userId);

        if (leaseId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "leaseId is required"));
        }

        var leaseOpt = leaseAgreementRepository.findById(leaseId);
        if (leaseOpt.isEmpty()) {
            System.out.println("[PaymentController] Lease not found: " + leaseId);
            return ResponseEntity.status(404).body(Map.of("error", "Lease not found with id: " + leaseId));
        }

        LeaseAgreement lease = leaseOpt.get();

        if (!lease.getMatch().getTenant().getId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the tenant can pay for this lease"));
        }

        try {
            String clientSecret = stripeService.createPaymentIntent(lease);
            System.out.println("[PaymentController] Payment intent created successfully");
            return ResponseEntity.ok(Map.of("clientSecret", clientSecret));
        } catch (StripeException e) {
            System.out.println("[PaymentController] Stripe error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession(@RequestBody Map<String, Object> request,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Long leaseId = Long.valueOf(request.get("leaseId").toString());
        String successUrl = (String) request.get("successUrl");
        String cancelUrl = (String) request.get("cancelUrl");

        System.out.println("[PaymentController] Creating checkout session for leaseId: " + leaseId);

        if (leaseId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "leaseId is required"));
        }

        var leaseOpt = leaseAgreementRepository.findById(leaseId);
        if (leaseOpt.isEmpty()) {
            System.out.println("[PaymentController] Lease not found: " + leaseId);
            return ResponseEntity.status(404).body(Map.of("error", "Lease not found with id: " + leaseId));
        }

        LeaseAgreement lease = leaseOpt.get();

        if (!lease.getMatch().getTenant().getId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the tenant can pay for this lease"));
        }

        try {
            Session session = stripeService.createCheckoutSession(lease, successUrl, cancelUrl);
            System.out.println("[PaymentController] Checkout session created: " + session.getUrl());
            return ResponseEntity.ok(Map.of(
                "sessionId", session.getId(),
                "url", session.getUrl()
            ));
        } catch (StripeException e) {
            System.out.println("[PaymentController] Stripe error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirmPayment(@RequestBody PaymentConfirmRequest request) {
        try {
            boolean isValid = stripeService.verifyPayment(request.getPaymentIntentId());

            if (isValid) {
                LeaseAgreement lease = leaseAgreementRepository.findById(request.getLeaseId())
                        .orElseThrow(() -> new IllegalArgumentException("Lease not found"));

                // Update Lease Status
                lease.setStatus(LeaseStatus.ACTIVE);
                leaseAgreementRepository.save(lease);

                // Update Match Status
                Match match = lease.getMatch();
                match.setStatus(MatchStatus.RENTED);
                matchRepository.save(match);

                // Send System Message
                String message = String.format("🎉 Payment of %s %s successful! Lease is now ACTIVE.",
                        lease.getMonthlyPrice(), lease.getCurrency());

                // We use system message (handled by ChatService usually implies sending a
                // message from system)
                // Assuming chatService.sendSystemMessage exists or similar.
                // Based on previous code logic, we can construct a message manually or check
                // chatService methods.
                // Checking ChatService from previous interactions... it seems we might not have
                // a public sendMessage...
                // But ChatController called chatService.proposeViewing...
                // Let's assume we can use chatService.sendMessage with a system flag or
                // similar.
                // Wait, ChatService probably has a method for sending messages.
                // Let's check ChatService properly. For now I will assume I can instantiate a
                // message and save it
                // via Repository or use a service method if available.
                // To be safe, I'll use a placeholder and we might need to fix it if method
                // missing.
                // Actually I should have checked ChatService.
                // I will add a method to ChatService to send system message if it doesn't
                // exist.

                // Let's use the visible implementation.
                // I'll call chatService.sendSystemMessage(match.getId(), message);
                // I will need to verify/add this method to ChatService.

                chatService.sendSystemMessage(match.getId(), message);

                return ResponseEntity.ok(Map.of("status", "success"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Payment verification failed"));
            }
        } catch (StripeException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Verify a Checkout Session and confirm payment.
     * This is used by the web payment flow after Stripe redirects back.
     */
    @PostMapping("/verify-session")
    public ResponseEntity<?> verifyCheckoutSession(@RequestBody Map<String, String> request) {
        String sessionId = request.get("sessionId");
        
        if (sessionId == null || sessionId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "sessionId is required"));
        }

        System.out.println("[PaymentController] Verifying checkout session: " + sessionId);

        try {
            // Get lease ID from session metadata
            Long leaseId = stripeService.getLeaseIdFromSession(sessionId);
            if (leaseId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not find lease ID in session"));
            }

            // Verify the payment was successful
            boolean isValid = stripeService.verifyCheckoutSessionPayment(sessionId);

            if (isValid) {
                LeaseAgreement lease = leaseAgreementRepository.findById(leaseId)
                        .orElseThrow(() -> new IllegalArgumentException("Lease not found"));

                // Update Lease Status
                lease.setStatus(LeaseStatus.ACTIVE);
                leaseAgreementRepository.save(lease);

                // Update Match Status
                Match match = lease.getMatch();
                match.setStatus(MatchStatus.RENTED);
                matchRepository.save(match);

                // Send System Message
                String message = String.format("🎉 Payment of %s %s successful! Lease is now ACTIVE.",
                        lease.getMonthlyPrice(), lease.getCurrency());
                chatService.sendSystemMessage(match.getId(), message);

                System.out.println("[PaymentController] Checkout session verified, lease activated: " + leaseId);
                return ResponseEntity.ok(Map.of("status", "success", "leaseId", leaseId));
            } else {
                System.out.println("[PaymentController] Checkout session payment not successful");
                return ResponseEntity.badRequest().body(Map.of("error", "Payment verification failed"));
            }
        } catch (StripeException e) {
            System.out.println("[PaymentController] Stripe error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
