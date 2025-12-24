package com.roomify.model;

public enum MatchStatus {
    TENANT_LIKED,   // Tenant swiped right (Landlord hasn't seen/acted yet)
    LANDLORD_LIKED, // Landlord swiped right (Tenant hasn't seen/acted yet)
    MATCHED         // Both swiped right -> It's a Match!
}