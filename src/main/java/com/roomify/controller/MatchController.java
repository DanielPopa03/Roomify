package com.roomify.controller;

import com.roomify.model.Match;
import com.roomify.service.MatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/matches")
public class MatchController {
    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    // Tenant Swipes
    @PostMapping("/tenant/swipe/{propertyId}")
    public ResponseEntity<Match> tenantSwipe(@AuthenticationPrincipal Jwt jwt, @PathVariable Long propertyId) {
        return ResponseEntity.ok(matchService.swipeByTenant(jwt.getSubject(), propertyId));
    }

    // Get Tenants who liked my properties
    @GetMapping("/landlord/pending")
    public ResponseEntity<List<Match>> getPendingTenants(@AuthenticationPrincipal Jwt jwt) {
        // You'll need to add findByLandlordIdAndStatus in MatchRepository
        return ResponseEntity.ok(matchService.getPendingLikesForLandlord(jwt.getSubject()));
    }

    // Keep your existing Accept endpoint
    @PostMapping("/landlord/swipe")
    public ResponseEntity<Match> landlordSwipe(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> payload) {
        String tenantId = (String) payload.get("tenantId");
        Long propertyId = Long.valueOf(payload.get("propertyId").toString());
        // Pass 'true' for accepted
        return ResponseEntity.ok(matchService.respondByLandlord(jwt.getSubject(), tenantId, propertyId, true));
    }

    // Add the Decline endpoint
    @PostMapping("/landlord/decline")
    public ResponseEntity<Match> landlordDecline(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> payload) {
        String tenantId = (String) payload.get("tenantId");
        Long propertyId = Long.valueOf(payload.get("propertyId").toString());
        // Pass 'false' for accepted
        return ResponseEntity.ok(matchService.respondByLandlord(jwt.getSubject(), tenantId, propertyId, false));
    }
}