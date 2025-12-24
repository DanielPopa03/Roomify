package com.roomify.repository;

import com.roomify.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    @Query("SELECT p FROM Property p " +
            "WHERE p.owner.id != :userId " +
            "AND p.id NOT IN (" +
            "    SELECT m.property.id FROM Match m " +
            "    WHERE m.tenant.id = :userId " +
            "    AND m.status IN (" +
            "        com.roomify.model.enums.MatchStatus.TENANT_LIKED, " +
            "        com.roomify.model.enums.MatchStatus.MATCHED, " +
            "        com.roomify.model.enums.MatchStatus.LANDLORD_DECLINED" +
            "    )" +
            ")")
    List<Property> findFeedForTenant(@Param("userId") String userId);
    Page<Property> findByOwner_Id(String id, Pageable pageable);

    List<Property> findAllByOwner_Id(String ownerId);
}