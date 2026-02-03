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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

        // --- TRENDING CALCULATION ---

        /**
         * Count recent likes (TENANT_LIKED or MATCHED) for a property within a time
         * window.
         * Used for "Trending/Hot" badge calculation.
         */
        @Query("SELECT COUNT(m) FROM Match m " +
                        "WHERE m.property.id = :propertyId " +
                        "AND (m.status = 'TENANT_LIKED' OR m.status = 'MATCHED') " +
                        "AND m.createdAt >= :since")
        int countRecentLikes(@Param("propertyId") Long propertyId,
                        @Param("since") LocalDateTime since);

        /**
         * Batch query to get like counts for multiple properties.
         * Used in feed to avoid N+1 queries.
         */
        @Query("SELECT m.property.id, COUNT(m) FROM Match m " +
                        "WHERE m.property.id IN :propertyIds " +
                        "AND (m.status = 'TENANT_LIKED' OR m.status = 'MATCHED') " +
                        "AND m.createdAt >= :since " +
                        "GROUP BY m.property.id")
        List<Object[]> countRecentLikesForProperties(@Param("propertyIds") List<Long> propertyIds,
                        @Param("since") LocalDateTime since);

        // --- CRITICAL FOR SCORING SERVICE ---
        // Fetches full history (Likes, Declines, Matches) so the Service can
        // calculate the score penalty for dislikes.
        List<Match> findAllByTenant_Id(String tenantId);

        // --- LEGACY/HELPER QUERIES ---

        // Updated to include DECLINED.
        // If you use this for filtering "Seen" items, this ensures Disliked items count
        // as "Seen".
        @Query("SELECT m.property.id FROM Match m WHERE m.tenant.id = :tenantId AND (m.status = 'TENANT_LIKED' OR m.status = 'MATCHED' OR m.status = 'TENANT_DECLINED')")
        List<Long> findPropertyIdsInteractedByTenant(@Param("tenantId") String tenantId);

        // Landlord view: Includes users they have already Liked, Matched with, or
        // Declined
        @Query("SELECT m.tenant.id FROM Match m WHERE m.landlord.id = :landlordId AND m.property.id = :propertyId AND (m.status = 'LANDLORD_LIKED' OR m.status = 'MATCHED' OR m.status = 'LANDLORD_DECLINED')")
        List<String> findTenantIdsInteractedByLandlord(@Param("landlordId") String landlordId,
                        @Param("propertyId") Long propertyId);

        // --- FINDERS ---

        Optional<Match> findByTenantAndProperty(User tenant, Property property);

        // Used to prevent creating duplicate matches
        Optional<Match> findByTenant_IdAndProperty_Id(String tenantId, Long propertyId);

        List<Match> findByTenant(User tenant);

        List<Match> findByLandlord(User landlord);

        // Fetch confirmed matches or pending likes for Landlord dashboard
        List<Match> findByLandlord_IdAndStatus(String landlordId, MatchStatus status);

        List<Match> findByLandlord_IdAndStatusOrderByUpdatedAtDesc(String landlordId, MatchStatus status);

        List<Match> findByTenant_IdAndStatusOrderByUpdatedAtDesc(String tenantId, MatchStatus status);

        // --- RENTAL WORKFLOW: Find by multiple statuses ---

        List<Match> findByLandlord_IdAndStatusInOrderByUpdatedAtDesc(String landlordId, List<MatchStatus> statuses);

        List<Match> findByTenant_IdAndStatusInOrderByUpdatedAtDesc(String tenantId, List<MatchStatus> statuses);

        // --- DELETE OPERATIONS ---

        @Modifying
        @Transactional
        void deleteByPropertyId(Long propertyId);

        @Modifying
        @Transactional
        void deleteByTenantId(String tenantId);
}