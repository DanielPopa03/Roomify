package com.roomify.service;

import com.roomify.exception.AccountProviderMismatchException;
import com.roomify.model.Role;
import com.roomify.model.User;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.RoleRepository;
import com.roomify.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final MatchRepository matchRepository;
    private final PropertyService propertyService;

    private static final Pattern PHONE_PATTERN = Pattern.compile("^[+]?[0-9\\s\\-\\(\\)]{7,20}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       MatchRepository matchRepository,
                       PropertyService propertyService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.matchRepository = matchRepository;
        this.propertyService = propertyService;
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    @Transactional
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("LANDLORD".equals(user.getRole().getName())) {
            propertyService.deleteAllByLandlord(userId);
        } else {
            matchRepository.deleteByTenantId(userId);
        }
        userRepository.delete(user);
    }

    @Transactional
    public User updateOrCreateUser(String id, Map<String, Object> payload) {
        // 1. Email Validation
        String emailInput = (String) payload.get("email");
        if (emailInput != null && !EMAIL_PATTERN.matcher(emailInput).matches()) {
            throw new IllegalArgumentException("Invalid email format.");
        }

        // 2. Phone Validation
        String phoneInput = (String) payload.get("phoneNumber");
        if (phoneInput != null && !phoneInput.trim().isEmpty() && !PHONE_PATTERN.matcher(phoneInput).matches()) {
            throw new IllegalArgumentException("Invalid phone number format.");
        }

        return userRepository.findById(id)
                .map(existingUser -> {
                    if (payload.containsKey("name")) existingUser.setFirstName((String) payload.get("name"));
                    if (payload.containsKey("bio")) existingUser.setBio((String) payload.get("bio"));
                    if (payload.containsKey("phoneNumber")) existingUser.setPhoneNumber(phoneInput);
                    if (payload.containsKey("email")) existingUser.setEmail(emailInput);

                    if (payload.containsKey("role")) {
                        String roleName = ((String) payload.get("role")).toUpperCase();
                        roleRepository.findByName(roleName).ifPresent(existingUser::setRole);
                    }

                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    Role defaultRole = roleRepository.findByName("USER").orElse(null);
                    User newUser = User.builder()
                            .id(id)
                            .firstName((String) payload.get("name"))
                            .email(emailInput)
                            .phoneNumber(phoneInput)
                            .role(defaultRole)
                            .build();
                    return userRepository.save(newUser);
                });
    }

    @Transactional
    public User getOrSyncUser() {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            Jwt jwt = (Jwt) authentication.getPrincipal();
            String currentId = jwt.getSubject();

            Optional<User> existingUserById = userRepository.findById(currentId);
            if (existingUserById.isPresent()) return existingUserById.get();

            String email = jwt.getClaimAsString("email");
            if (email == null) {
                // Generate temporary placeholder to satisfy DB constraints
                email = currentId.replace("|", ".") + "@no-email.roomify.com";
            }

            Role userRole = roleRepository.findByName("USER").orElseThrow();

            User newUser = User.builder()
                    .id(currentId)
                    .email(email)
                    .role(userRole)
                    .firstName(jwt.getClaimAsString("name") != null ? jwt.getClaimAsString("name") : "New User")
                    .build();

            return userRepository.save(newUser);
        } catch (Exception e) {
            throw new RuntimeException("Error during user sync", e);
        }
    }

    /**
     * Checks if the provided email is already claimed by another account,
     * accounting for Gmail dot-aliases.
     */
    public boolean isEmailTaken(String email, String currentUserId) {
        // If it's the temporary placeholder, it's never "taken"
        if (email.endsWith("@no-email.roomify.com")) {
            return false;
        }

        return userRepository.existsByEmailFlexible(email.trim(), currentUserId);
    }
}