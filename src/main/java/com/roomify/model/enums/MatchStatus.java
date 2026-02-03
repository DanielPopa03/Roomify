package com.roomify.model.enums;

public enum MatchStatus {
    // --- Initial Matching Phase ---
    TENANT_LIKED,
    LANDLORD_LIKED,
    MATCHED,

    // --- Rental Workflow Phase ---
    VIEWING_REQUESTED, // Someone proposed a viewing
    VIEWING_SCHEDULED, // Both parties confirmed the viewing
    OFFER_PENDING, // Landlord sent a rent proposal
    RENTED, // Tenant paid, lease is active

    // --- Decline States ---
    LANDLORD_DECLINED,
    TENANT_DECLINED
}