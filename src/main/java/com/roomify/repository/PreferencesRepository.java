package com.roomify.repository;

import com.roomify.model.Preferences;
import com.roomify.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PreferencesRepository extends JpaRepository<Preferences, Long> {
    Optional<Preferences> findByUser(User user);
    Optional<Preferences> findByUserId(String userId);
    void deleteByUserId(String userId);
}
