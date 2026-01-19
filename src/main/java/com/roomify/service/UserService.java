package com.roomify.service;

import com.roomify.model.Match;
import com.roomify.model.Role;
import com.roomify.model.User;
import com.roomify.model.enums.MatchStatus;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.RoleRepository;
import com.roomify.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final MatchRepository matchRepository;
    private final PropertyService propertyService;

    // Directory for user images
    private final Path rootLocation = Paths.get("uploads");

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
        initStorage();
    }

    private void initStorage() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage", e);
        }
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public List<User> getTenantFeed(String landlordId, Long propertyId) {
        // 1. Get all Users
        List<User> allUsers = userRepository.findAll();

        // 2. Filter for TENANT role (Check both "USER" and "TENANT")
        List<User> allTenants = allUsers.stream()
                .filter(u -> u.getRole() != null &&
                        ("USER".equalsIgnoreCase(u.getRole().getName()) ||
                                "TENANT".equalsIgnoreCase(u.getRole().getName())))
                .collect(Collectors.toList());

        // 3. Filter out already matched users if a property is selected
        if (propertyId != null) {
            List<Match> matchesForThisProperty = matchRepository.findAll().stream()
                    .filter(m -> m.getProperty().getId().equals(propertyId))
                    .toList();

            Set<String> excludedTenantIds = matchesForThisProperty.stream()
                    // Only exclude if I (Landlord) have already acted, or if we are fully matched
                    .filter(m -> m.getStatus() == MatchStatus.LANDLORD_LIKED ||
                            m.getStatus() == MatchStatus.MATCHED ||
                            m.getStatus() == MatchStatus.LANDLORD_DECLINED)
                    .map(m -> m.getTenant().getId())
                    .collect(Collectors.toSet());

            return allTenants.stream()
                    .filter(t -> !excludedTenantIds.contains(t.getId()))
                    .collect(Collectors.toList());
        }

        return allTenants;
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

        // Delete all user photos from disk before deleting user
        if (user.getPhotos() != null) {
            for (String photoUrl : user.getPhotos()) {
                deleteFileFromDisk(photoUrl);
            }
        }

        userRepository.delete(user);
    }

    @Transactional
    public User updateOrCreateUser(String id, Map<String, Object> payload) {
        // 1. Validations
        String emailInput = (String) payload.get("email");
        if (emailInput != null && !EMAIL_PATTERN.matcher(emailInput).matches()) {
            throw new IllegalArgumentException("Invalid email format.");
        }

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

                    // --- IMAGE HANDLING WITH DELETION ---
                    if (payload.containsKey("photos")) {
                        List<String> rawPhotos = (List<String>) payload.get("photos");
                        List<String> processedPhotos = new ArrayList<>();

                        // 1. Capture old photos to find orphans
                        List<String> oldPhotos = new ArrayList<>(existingUser.getPhotos());

                        // 2. Process new list (save new base64s, keep URLs)
                        for (String photoStr : rawPhotos) {
                            if (photoStr.startsWith("data:image")) {
                                String savedUrl = saveBase64Image(photoStr);
                                processedPhotos.add(savedUrl);
                            } else {
                                processedPhotos.add(photoStr);
                            }
                        }

                        // 3. Find Orphaned Photos (Present in Old, NOT in New)
                        // We only delete if it's a local file (starts with /user/images/)
                        for (String oldUrl : oldPhotos) {
                            if (!processedPhotos.contains(oldUrl)) {
                                deleteFileFromDisk(oldUrl);
                            }
                        }

                        // 4. Update DB
                        existingUser.setPhotos(processedPhotos);
                        existingUser.setPicture(!processedPhotos.isEmpty() ? processedPhotos.get(0) : null);
                    }

                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    // Create New User Logic
                    Role defaultRole = roleRepository.findByName("USER").orElse(null);

                    User.UserBuilder newUser = User.builder()
                            .id(id)
                            .firstName((String) payload.get("name"))
                            .email(emailInput)
                            .phoneNumber(phoneInput)
                            .role(defaultRole);

                    // Handle photos for new users (no deletions needed here)
                    if (payload.containsKey("photos")) {
                        List<String> rawPhotos = (List<String>) payload.get("photos");
                        List<String> processedPhotos = new ArrayList<>();
                        for (String photoStr : rawPhotos) {
                            if (photoStr.startsWith("data:image")) {
                                processedPhotos.add(saveBase64Image(photoStr));
                            } else {
                                processedPhotos.add(photoStr);
                            }
                        }
                        newUser.photos(processedPhotos);
                        if (!processedPhotos.isEmpty()) newUser.picture(processedPhotos.get(0));
                    }

                    return userRepository.save(newUser.build());
                });
    }

    // --- HELPER: Save Base64 to File ---
    private String saveBase64Image(String base64Data) {
        try {
            String[] parts = base64Data.split(",");
            String imageString = parts.length > 1 ? parts[1] : parts[0];
            byte[] imageBytes = Base64.getDecoder().decode(imageString);
            String filename = UUID.randomUUID().toString() + ".jpg";
            Path destinationFile = this.rootLocation.resolve(filename);
            Files.write(destinationFile, imageBytes);
            return "/user/images/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to save profile image", e);
        }
    }

    // --- HELPER: Delete File from Disk ---
    private void deleteFileFromDisk(String fileUrl) {
        // Only delete local files managed by us
        if (fileUrl == null || !fileUrl.startsWith("/user/images/")) return;

        try {
            // Extract filename from URL: "/user/images/abc.jpg" -> "abc.jpg"
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Path filePath = this.rootLocation.resolve(filename);
            Files.deleteIfExists(filePath);
            System.out.println("Deleted orphaned file: " + filename);
        } catch (IOException e) {
            System.err.println("Warning: Could not delete file: " + fileUrl);
        }
    }

    @Transactional
    public User getOrSyncUser() {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            Jwt jwt = (Jwt) authentication.getPrincipal();
            String currentId = jwt.getSubject();
            String pictureUrl = jwt.getClaimAsString("picture");

            Optional<User> existingUserById = userRepository.findById(currentId);

            if (existingUserById.isPresent()) {
                User existing = existingUserById.get();
                // If user has no photos but Token has one, add it
                if (pictureUrl != null && (existing.getPhotos() == null || existing.getPhotos().isEmpty())) {
                    List<String> photos = new ArrayList<>();
                    photos.add(pictureUrl);
                    existing.setPhotos(photos);
                    existing.setPicture(pictureUrl);
                    return userRepository.save(existing);
                }
                return existing;
            }

            String email = jwt.getClaimAsString("email");
            if (email == null) email = currentId.replace("|", ".") + "@no-email.roomify.com";

            Role userRole = roleRepository.findByName("USER").orElseThrow();

            List<String> photos = new ArrayList<>();
            if (pictureUrl != null) photos.add(pictureUrl);

            User newUser = User.builder()
                    .id(currentId)
                    .email(email)
                    .role(userRole)
                    .firstName(jwt.getClaimAsString("name") != null ? jwt.getClaimAsString("name") : "New User")
                    .picture(pictureUrl)
                    .photos(photos)
                    .build();

            return userRepository.save(newUser);
        } catch (Exception e) {
            throw new RuntimeException("Error during user sync", e);
        }
    }

    public boolean isEmailTaken(String email, String currentUserId) {
        if (email.endsWith("@no-email.roomify.com")) return false;
        return userRepository.existsByEmailFlexible(email.trim(), currentUserId);
    }
}