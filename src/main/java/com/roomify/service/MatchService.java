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

    public MatchService(MatchRepository matchRepository, PropertyRepository propertyRepository, UserRepository userRepository) {
        this.matchRepository = matchRepository;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
    }

    /**
     * Case 1: Tenant swipes right on a Property
     */
    @Transactional
    public Match swipeByTenant(String tenantId, Long propertyId) {
        User tenant = userRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        // FIX: Fetch landlord using the ownerId string stored in property
        User landlord = userRepository.findById(property.getOwner().getId())
                .orElseThrow(() -> new RuntimeException("Landlord not found"));

        // 1. Role Validation
        if (tenant.getId().equals(landlord.getId())) {
            throw new RuntimeException("You cannot swipe on your own property.");
        }

        Optional<Match> existing = matchRepository.findByTenantAndProperty(tenant, property);

        if (existing.isPresent()) {
            Match match = existing.get();
            // If Landlord already liked it -> UPGRADE TO MATCH
            if (match.getStatus() == MatchStatus.LANDLORD_LIKED) {
                match.setStatus(MatchStatus.MATCHED);
                return matchRepository.save(match);
            }
            return match; // Already TENANT_LIKED or MATCHED
        } else {
            // New Interaction
            Match newMatch = Match.builder()
                    .tenant(tenant)
                    .landlord(landlord)
                    .property(property)
                    .status(MatchStatus.TENANT_LIKED)
                    .build();
            return matchRepository.save(newMatch);
        }
    }

    public List<Match> getPendingLikesForLandlord(String landlordId) {
        // Returns matches where Tenant Liked, but Landlord hasn't swiped yet
        return matchRepository.findByLandlord_IdAndStatus(landlordId, MatchStatus.TENANT_LIKED);
    }

    @Transactional
    public Match respondByLandlord(String landlordId, String tenantId, Long propertyId, boolean accepted) {
        // 1. Find the existing interaction
        Match match = matchRepository.findByTenantAndProperty(
                userRepository.getReferenceById(tenantId),
                propertyRepository.getReferenceById(propertyId)
        ).orElseThrow(() -> new RuntimeException("Interaction not found"));

        // 2. Ownership Validation
        if (!match.getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Unauthorized: You do not own this property");
        }

        // 3. Status Logic
        if (accepted) {
            // Double Opt-in: Only upgrade to MATCHED if the tenant already liked it
            if (match.getStatus() == MatchStatus.TENANT_LIKED) {
                match.setStatus(MatchStatus.MATCHED);
            } else {
                match.setStatus(MatchStatus.LANDLORD_LIKED);
            }
        } else {
            // Mark as declined so it is filtered out of both feeds
            match.setStatus(MatchStatus.LANDLORD_DECLINED);
        }

        return matchRepository.save(match);
    }
}