package com.roomify.repository;

import com.roomify.model.PropertyView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface PropertyViewRepository extends JpaRepository<PropertyView, Long> {

        /**
         * Count active viewers for a property within a time window.
         * Used for "X people viewing this now" feature.
         */
        @Query("SELECT COUNT(DISTINCT pv.viewerId) FROM PropertyView pv " +
                        "WHERE pv.property.id = :propertyId AND pv.viewedAt >= :since")
        int countActiveViewers(@Param("propertyId") Long propertyId,
                        @Param("since") LocalDateTime since);

        /**
         * Batch query to get active viewers for multiple properties.
         */
        @Query("SELECT pv.property.id, COUNT(DISTINCT pv.viewerId) FROM PropertyView pv " +
                        "WHERE pv.property.id IN :propertyIds AND pv.viewedAt >= :since " +
                        "GROUP BY pv.property.id")
        java.util.List<Object[]> countActiveViewersForProperties(@Param("propertyIds") java.util.List<Long> propertyIds,
                        @Param("since") LocalDateTime since);

        /**
         * Check if a view already exists for deduplication.
         * Returns true if same viewer viewed same property within the dedup window.
         */
        @Query("SELECT COUNT(pv) > 0 FROM PropertyView pv " +
                        "WHERE pv.property.id = :propertyId " +
                        "AND pv.viewerId = :viewerId " +
                        "AND pv.viewedAt >= :since")
        boolean existsRecentView(@Param("propertyId") Long propertyId,
                        @Param("viewerId") String viewerId,
                        @Param("since") LocalDateTime since);

        /**
         * Delete old view records for data cleanup.
         * Called by scheduled task to purge records older than retention period.
         */
        @Modifying
        @Query("DELETE FROM PropertyView pv WHERE pv.viewedAt < :cutoff")
        int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
