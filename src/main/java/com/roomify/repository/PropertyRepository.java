package com.roomify.repository;

import com.roomify.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    Page<Property> findByOwnerId(String ownerId, Pageable pageable);
}
