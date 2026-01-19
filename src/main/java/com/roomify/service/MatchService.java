package com.roomify.service;

import com.roomify.model.Match;
import com.roomify.model.Property;
import com.roomify.model.User;
import com.roomify.model.enums.MatchStatus;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.PropertyRepository;
import com.roomify.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MatchService {

    private final MatchRepository matchRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;

    // Threshold: If score is below this, they are effectively blocked/hidden
    private static final double VISIBILITY_THRESHOLD = -10.0;
    private static final double LIKE_SCORE = 10.0;
    private static final double PASS_SCORE = -50.0;

    public MatchService(MatchRepository matchRepository, PropertyRepository propertyRepository, UserRepository userRepository) {
        this.matchRepository = matchRepository;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
    }

    // --- TENANT ACTIONS ---

    /**
     * Tenant Swipes RIGHT (Like)
     */
    @Transactional
    public Match swipeByTenant(String tenantId, Long propertyId) {
        return handleInteraction(tenantId, propertyId, true, true);
    }

    /**
     * Tenant Swipes LEFT (Pass)
     */
    @Transactional
    public Match passByTenant(String tenantId, Long propertyId) {
        return handleInteraction(tenantId, propertyId, true, false);
    }

    // --- LANDLORD ACTIONS ---

    /**
     * Landlord Swipes RIGHT (Invite)
     */
    @Transactional
    public Match inviteTenant(String landlordId, String tenantId, Long propertyId) {
        // Verify ownership inside helper or wrapper, doing concise check here:
        Property property = propertyRepository.findById(propertyId).orElseThrow();
        if (!property.getOwner().getId().equals(landlordId)) throw new RuntimeException("Unauthorized");

        return handleInteraction(tenantId, propertyId, false, true);
    }

    /**
     * Landlord Swipes LEFT (Pass/Decline)
     */
    @Transactional
    public Match passByLandlord(String landlordId, String tenantId, Long propertyId) {
        Property property = propertyRepository.findById(propertyId).orElseThrow();
        if (!property.getOwner().getId().equals(landlordId)) throw new RuntimeException("Unauthorized");

        return handleInteraction(tenantId, propertyId, false, false);
    }

    // --- CORE LOGIC ---

    private Match handleInteraction(String tenantId, Long propertyId, boolean isTenantAction, boolean isLike) {
        User tenant = userRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Property property = propertyRepository.findById(propertyId).orElseThrow(() -> new RuntimeException("Property not found"));
        User landlord = property.getOwner();

        if (tenant.getId().equals(landlord.getId())) throw new RuntimeException("Self-interaction invalid");

        Optional<Match> existing = matchRepository.findByTenantAndProperty(tenant, property);
        Match match;

        if (existing.isPresent()) {
            match = existing.get();
        } else {
            match = Match.builder()
                    .tenant(tenant)
                    .landlord(landlord)
                    .property(property)
                    .status(MatchStatus.TENANT_DECLINED) // Default placeholder
                    .score(0.0)
                    .build();
        }

        // Apply Score Logic
        double scoreChange = isLike ? LIKE_SCORE : PASS_SCORE;
        match.setScore(match.getScore() + scoreChange);

        // Update Status
        if (isTenantAction) {
            if (isLike) {
                // If Landlord already liked, it's a match
                if (match.getStatus() == MatchStatus.LANDLORD_LIKED) {
                    match.setStatus(MatchStatus.MATCHED);
                } else {
                    match.setStatus(MatchStatus.TENANT_LIKED);
                }
            } else {
                match.setStatus(MatchStatus.TENANT_DECLINED);
            }
        } else { // Landlord Action
            if (isLike) {
                // If Tenant already liked, it's a match
                if (match.getStatus() == MatchStatus.TENANT_LIKED) {
                    match.setStatus(MatchStatus.MATCHED);
                } else {
                    match.setStatus(MatchStatus.LANDLORD_LIKED);
                }
            } else {
                match.setStatus(MatchStatus.LANDLORD_DECLINED);
            }
        }

        return matchRepository.save(match);
    }

    public List<Match> getPendingLikesForLandlord(String landlordId) {
        return matchRepository.findByLandlord_IdAndStatus(landlordId, MatchStatus.TENANT_LIKED);
    }

    public List<Match> getConfirmedMatches(String landlordId) {
        return matchRepository.findByLandlord_IdAndStatus(landlordId, MatchStatus.MATCHED);
    }
}