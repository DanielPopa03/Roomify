package com.roomify.repository;

import com.roomify.model.LeaseAgreement;
import com.roomify.model.enums.LeaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaseAgreementRepository extends JpaRepository<LeaseAgreement, Long> {

    /**
     * Find the lease agreement for a specific match.
     */
    Optional<LeaseAgreement> findByMatchId(Long matchId);

    /**
     * Find lease by match and status (e.g., find pending proposal).
     */
    Optional<LeaseAgreement> findByMatchIdAndStatus(Long matchId, LeaseStatus status);

    /**
     * Check if a match already has an active lease.
     */
    boolean existsByMatchIdAndStatus(Long matchId, LeaseStatus status);

    /**
     * Find active lease for a tenant by their user ID.
     */
    @Query("SELECT la FROM LeaseAgreement la WHERE la.match.tenant.id = :tenantId AND la.status = :status")
    Optional<LeaseAgreement> findByTenantIdAndStatus(@Param("tenantId") String tenantId, @Param("status") LeaseStatus status);

    /**
     * Get all property IDs that have an active lease.
     */
    @Query("SELECT la.match.property.id FROM LeaseAgreement la WHERE la.status = :status")
    List<Long> findPropertyIdsByLeaseStatus(@Param("status") LeaseStatus status);
}
