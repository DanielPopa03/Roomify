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

    // --- LANDLORD ---

    @PostMapping("/landlord/invite")
    public ResponseEntity<Match> landlordInvite(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> payload) {
        String tenantId = (String) payload.get("tenantId");
        Long propertyId = Long.valueOf(payload.get("propertyId").toString());
        return ResponseEntity.ok(matchService.inviteTenant(jwt.getSubject(), tenantId, propertyId));
    }

    @PostMapping("/landlord/pass") // Swipe Left
    public ResponseEntity<Match> landlordPass(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> payload) {
        String tenantId = (String) payload.get("tenantId");
        Long propertyId = Long.valueOf(payload.get("propertyId").toString());
        return ResponseEntity.ok(matchService.passByLandlord(jwt.getSubject(), tenantId, propertyId));
    }

    @PostMapping("/landlord/decline") // Explicit Decline in Pending list
    public ResponseEntity<Match> landlordDecline(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> payload) {
        String tenantId = (String) payload.get("tenantId");
        Long propertyId = Long.valueOf(payload.get("propertyId").toString());
        return ResponseEntity.ok(matchService.passByLandlord(jwt.getSubject(), tenantId, propertyId));
    }

    // --- TENANT ---

    @PostMapping("/tenant/swipe/{propertyId}") // Swipe Right
    public ResponseEntity<Match> tenantSwipe(@AuthenticationPrincipal Jwt jwt, @PathVariable Long propertyId) {
        return ResponseEntity.ok(matchService.swipeByTenant(jwt.getSubject(), propertyId));
    }

    @PostMapping("/tenant/pass/{propertyId}") // Swipe Left
    public ResponseEntity<Match> tenantPass(@AuthenticationPrincipal Jwt jwt, @PathVariable Long propertyId) {
        return ResponseEntity.ok(matchService.passByTenant(jwt.getSubject(), propertyId));
    }

    // --- GETTERS ---
    @GetMapping("/landlord/matches")
    public ResponseEntity<List<Match>> getConfirmedMatches(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(matchService.getConfirmedMatches(jwt.getSubject()));
    }

    @GetMapping("/landlord/pending")
    public ResponseEntity<List<Match>> getPendingTenants(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(matchService.getPendingLikesForLandlord(jwt.getSubject()));
    }
}