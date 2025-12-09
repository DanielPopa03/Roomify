package com.roomify.service;

import com.roomify.model.Role;
import com.roomify.model.User;
import com.roomify.repository.RoleRepository;
import com.roomify.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public User getOrSyncUser() {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            Jwt jwt = (Jwt) authentication.getPrincipal();

            String authId = jwt.getSubject();
            String email = jwt.getClaimAsString("https://roomify-api/email");

            if (email == null) {
                throw new RuntimeException("Email claim is missing. Check Auth0 Actions.");
            }

            // 1. Happy Path: User found by Auth0 ID
            Optional<User> existingUser = userRepository.findById(authId);
            if (existingUser.isPresent()) {
                return existingUser.get();
            }

            // 2. Migration Path: User found by Email (but ID didn't match)
            Optional<User> userByEmail = userRepository.findByEmail(email);
            if (userByEmail.isPresent()) {
                User oldUser = userByEmail.get();
                Role savedRole = oldUser.getRole();
                String savedBio = oldUser.getBio();
                String savedName = oldUser.getFirstName();

                userRepository.delete(oldUser);
                userRepository.flush();

                User migratedUser = User.builder()
                        .id(authId)
                        .email(email)
                        .role(savedRole)
                        .firstName(savedName)
                        .bio(savedBio)
                        .build();

                return userRepository.save(migratedUser);
            }

            // 3. New User Path
            Role userRole = roleRepository.findByName("USER")
                    .orElseThrow(() -> new RuntimeException("Role 'USER' not found"));

            User newUser = User.builder()
                    .id(authId)
                    .email(email)
                    .role(userRole)
                    .build();

            return userRepository.save(newUser);

        } catch (Exception e) {
            throw new RuntimeException("Error occurred during user synchronization", e);
        }
    }
}
