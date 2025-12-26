package com.roomify.repository;

import com.roomify.model.Match;
import com.roomify.model.Property;
import com.roomify.model.User;
import com.roomify.model.enums.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;


import java.util.List;
import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByLandlord_IdAndStatus(String landlordId, MatchStatus status);

    @Query("SELECT m.property.id FROM Match m WHERE m.tenant.id = :tenantId AND (m.status = 'TENANT_LIKED' OR m.status = 'MATCHED')")
    List<Long> findPropertyIdsInteractedByTenant(@Param("tenantId") String tenantId);

    @Query("SELECT m.tenant.id FROM Match m WHERE m.landlord.id = :landlordId AND m.property.id = :propertyId AND (m.status = 'LANDLORD_LIKED' OR m.status = 'MATCHED')")
    List<String> findTenantIdsInteractedByLandlord(@Param("landlordId") String landlordId, @Param("propertyId") Long propertyId);

    Optional<Match> findByTenantAndProperty(User tenant, Property property);

    List<Match> findByTenant(User tenant);
    List<Match> findByLandlord(User landlord);

    @Modifying
    @Transactional
    void deleteByPropertyId(Long propertyId);

    @Modifying
    @Transactional
    void deleteByTenantId(String tenantId);

    Optional<Match> findByTenantAndPropertyId(String tenantId, Long propertyId);
    List<Match> findByLandlord_IdAndStatusOrderByUpdatedAtDesc(String landlordId, MatchStatus status);
    List<Match> findByTenant_IdAndStatusOrderByUpdatedAtDesc(String tenantId, MatchStatus status);
}