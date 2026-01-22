package com.roomify.repository;

import com.roomify.model.User;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    @Query("SELECT u FROM User u WHERE " +
            "(LOWER(u.email) = LOWER(:email)) OR " + // Standard match for everyone
            "(LOWER(u.email) LIKE '%@gmail.com' AND LOWER(REPLACE(u.email, '.', '')) = LOWER(REPLACE(:email, '.', '')))" // Dot ignore for Gmail only
    )
    Optional<User> findByEmailFlexible(@Param("email") String email);

    Optional<User> findById(String id);
    Optional<User> findByEmail(String email);
    List<User> findByRole_Name(String roleName);
    List<User> findByRole_NameAndIdNotIn(String roleName, List<String> ids);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE " +
            "u.id <> :currentId AND (" +
            "(LOWER(u.email) = LOWER(:email)) OR " +
            "(LOWER(u.email) LIKE '%@gmail.com' AND LOWER(REPLACE(u.email, '.', '')) = LOWER(REPLACE(:email, '.', '')))" +
            ")"
    )
    boolean existsByEmailFlexible(@Param("email") String email, @Param("currentId") String currentId);
}
