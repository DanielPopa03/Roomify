package com.roomify.model.enums;

/**
 * Status of a lease agreement in the rental workflow.
 */
public enum LeaseStatus {
    PENDING, // Landlord sent proposal, awaiting tenant response
    ACTIVE, // Tenant paid, lease is active
    REJECTED, // Tenant declined the proposal
    EXPIRED, // Proposal expired without action
    CANCELLED // Either party cancelled the lease
}
