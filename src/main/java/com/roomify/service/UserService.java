package com.roomify.service;

import com.roomify.model.Match;
import com.roomify.model.Property; // Need Property to score against
import com.roomify.model.Role;
import com.roomify.model.User;
import com.roomify.model.enums.MatchStatus;
import com.roomify.model.enums.PreferredTenantType;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.PropertyRepository; // Injected
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
    private final PropertyRepository propertyRepository; // Added for scoring

    private final Path rootLocation = Paths.get("uploads");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[+]?[0-9\\s\\-\\(\\)]{7,20}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       MatchRepository matchRepository,
                       PropertyService propertyService,
                       PropertyRepository propertyRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.matchRepository = matchRepository;
        this.propertyService = propertyService;
        this.propertyRepository = propertyRepository;
        initStorage();
    }

    private void initStorage() {
        try { Files.createDirectories(rootLocation); } catch (IOException e) { throw new RuntimeException(e); }
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    // --- LANDLORD VIEWING TENANTS (Reverse Feed) ---
    public List<User> getTenantFeed(String landlordId, Long propertyId) {
        // 1. Get all Tenants
        List<User> allUsers = userRepository.findAll();
        List<User> allTenants = allUsers.stream()
                .filter(u -> u.getRole() != null &&
                        ("USER".equalsIgnoreCase(u.getRole().getName()) ||
                                "TENANT".equalsIgnoreCase(u.getRole().getName())))
                .collect(Collectors.toList());

        if (propertyId == null) return allTenants;

        // 2. Filter Interacted Users (Hide Matched/Liked)
        // Keep Declined tenants visible if you want to retry? Usually we hide them.
        // For consistency with PropertyFeed, let's keep them if we want Soft Scoring on Dislikes.
        // But typically for people, if you dislike a person, they should be gone.
        // Let's stick to the requested logic: Soft Penalty.

        List<Match> history = matchRepository.findTenantIdsInteractedByLandlord(landlordId, propertyId).stream()
                .map(id -> matchRepository.findByTenantAndPropertyId(id, propertyId).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        Set<String> hiddenTenantIds = history.stream()
                .filter(m -> m.getStatus() == MatchStatus.MATCHED || m.getStatus() == MatchStatus.LANDLORD_LIKED)
                .map(m -> m.getTenant().getId())
                .collect(Collectors.toSet());

        // 3. Score Tenants against the Property
        Property property = propertyRepository.findById(propertyId).orElseThrow();
        Map<String, Double> scores = new HashMap<>();

        for (User tenant : allTenants) {
            if (hiddenTenantIds.contains(tenant.getId())) continue;

            double score = 50.0;

            // 1. Pets (Dealbreaker for Landlord)
            // If tenant has pets but property is NOT pet friendly -> Hide (-100)
            if (Boolean.TRUE.equals(tenant.getHasPets()) && Boolean.FALSE.equals(property.getPetFriendly())) {
                score = -100.0;
            }

            // 2. Smoking (Dealbreaker)
            if (Boolean.TRUE.equals(tenant.getIsSmoker()) && Boolean.FALSE.equals(property.getSmokerFriendly())) {
                score = -100.0;
            }

            // 3. Tenant Type (SOFT Penalty -20)
            if (score > 0 && property.getPreferredTenants() != null && !property.getPreferredTenants().isEmpty()) {
                if (tenant.getTenantType() != null) {
                    boolean isAccepted = property.getPreferredTenants().contains(tenant.getTenantType());
                    if (!isAccepted) {
                        score -= 20.0; // Soft Penalty
                    } else {
                        score += 20.0; // Bonus
                    }
                }
            }

            // 4. History Penalty (If previously declined)
            Optional<Match> prevInteraction = history.stream().filter(m -> m.getTenant().getId().equals(tenant.getId())).findFirst();
            if(prevInteraction.isPresent()) {
                score += prevInteraction.get().getScore(); // Adds negative score
            }

            if (score > 0.0) {
                scores.put(tenant.getId(), score);
            }
        }

        // 4. Sort
        return allTenants.stream()
                .filter(t -> scores.containsKey(t.getId()))
                .sorted((t1, t2) -> Double.compare(scores.get(t2.getId()), scores.get(t1.getId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if ("LANDLORD".equals(user.getRole().getName())) {
            propertyService.deleteAllByLandlord(userId);
        } else {
            matchRepository.deleteByTenantId(userId);
        }
        if (user.getPhotos() != null) {
            for (String photoUrl : user.getPhotos()) deleteFileFromDisk(photoUrl);
        }
        userRepository.delete(user);
    }

    @Transactional
    public User updateOrCreateUser(String id, Map<String, Object> payload) {
        String emailInput = (String) payload.get("email");
        String phoneInput = (String) payload.get("phoneNumber");

        return userRepository.findById(id)
                .map(existingUser -> {
                    if (payload.containsKey("name")) existingUser.setFirstName((String) payload.get("name"));
                    if (payload.containsKey("bio")) existingUser.setBio((String) payload.get("bio"));
                    if (payload.containsKey("phoneNumber")) existingUser.setPhoneNumber(phoneInput);
                    if (payload.containsKey("email")) existingUser.setEmail(emailInput);

                    if (payload.containsKey("role")) {
                        roleRepository.findByName(((String) payload.get("role")).toUpperCase()).ifPresent(existingUser::setRole);
                    }

                    if (payload.containsKey("isSmoker")) existingUser.setIsSmoker((Boolean) payload.get("isSmoker"));
                    if (payload.containsKey("hasPets")) existingUser.setHasPets((Boolean) payload.get("hasPets"));
                    if (payload.containsKey("wantsExtraBathroom")) existingUser.setWantsExtraBathroom((Boolean) payload.get("wantsExtraBathroom"));
                    if (payload.containsKey("minRooms") && payload.get("minRooms") instanceof Number) existingUser.setMinRooms(((Number) payload.get("minRooms")).intValue());

                    if (payload.containsKey("tenantType")) {
                        try { existingUser.setTenantType(PreferredTenantType.fromDisplayName((String) payload.get("tenantType"))); } catch (Exception ignored) {}
                    }

                    if (payload.containsKey("photos")) handlePhotos(existingUser, (List<String>) payload.get("photos"));

                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    Role defaultRole = roleRepository.findByName("USER").orElse(null);
                    User.UserBuilder newUser = User.builder().id(id).firstName((String) payload.get("name")).email(emailInput).phoneNumber(phoneInput).role(defaultRole);

                    if (payload.containsKey("isSmoker")) newUser.isSmoker((Boolean) payload.get("isSmoker"));
                    if (payload.containsKey("hasPets")) newUser.hasPets((Boolean) payload.get("hasPets"));

                    if (payload.containsKey("photos")) {
                        List<String> processed = processNewPhotos((List<String>) payload.get("photos"));
                        newUser.photos(processed);
                        if(!processed.isEmpty()) newUser.picture(processed.get(0));
                    }
                    return userRepository.save(newUser.build());
                });
    }

    private void handlePhotos(User user, List<String> rawPhotos) {
        List<String> oldPhotos = user.getPhotos() != null ? new ArrayList<>(user.getPhotos()) : new ArrayList<>();
        List<String> processed = processNewPhotos(rawPhotos);

        for (String oldUrl : oldPhotos) {
            if (!processed.contains(oldUrl)) deleteFileFromDisk(oldUrl);
        }
        user.setPhotos(processed);
        user.setPicture(!processed.isEmpty() ? processed.get(0) : null);
    }

    private List<String> processNewPhotos(List<String> rawPhotos) {
        List<String> processed = new ArrayList<>();
        for (String s : rawPhotos) {
            if (s.startsWith("data:image")) processed.add(saveBase64Image(s));
            else processed.add(s);
        }
        return processed;
    }

    private String saveBase64Image(String base64Data) {
        try {
            String[] parts = base64Data.split(",");
            String imageString = parts.length > 1 ? parts[1] : parts[0];
            byte[] imageBytes = Base64.getDecoder().decode(imageString);
            String filename = UUID.randomUUID().toString() + ".jpg";
            Files.write(this.rootLocation.resolve(filename), imageBytes);
            return "/user/images/" + filename;
        } catch (IOException e) { throw new RuntimeException(e); }
    }

    private void deleteFileFromDisk(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith("/user/images/")) return;
        try { Files.deleteIfExists(this.rootLocation.resolve(fileUrl.substring(fileUrl.lastIndexOf("/") + 1))); }
        catch (IOException e) { System.err.println("Warning: Could not delete " + fileUrl); }
    }

    @Transactional
    public User getOrSyncUser() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            Jwt jwt = (Jwt) auth.getPrincipal();
            String currentId = jwt.getSubject();
            String pictureUrl = jwt.getClaimAsString("picture");

            Optional<User> existingUserById = userRepository.findById(currentId);
            if (existingUserById.isPresent()) {
                User existing = existingUserById.get();
                if (pictureUrl != null && (existing.getPhotos() == null || existing.getPhotos().isEmpty())) {
                    existing.setPhotos(Collections.singletonList(pictureUrl));
                    existing.setPicture(pictureUrl);
                    return userRepository.save(existing);
                }
                return existing;
            }

            String email = jwt.getClaimAsString("email");
            if (email == null) email = currentId.replace("|", ".") + "@no-email.roomify.com";

            User newUser = User.builder()
                    .id(currentId)
                    .email(email)
                    .role(roleRepository.findByName("USER").orElseThrow())
                    .firstName(jwt.getClaimAsString("name") != null ? jwt.getClaimAsString("name") : "New User")
                    .picture(pictureUrl)
                    .photos(pictureUrl != null ? Collections.singletonList(pictureUrl) : new ArrayList<>())
                    .build();

            return userRepository.save(newUser);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    public boolean isEmailTaken(String email, String currentUserId) {
        if (email.endsWith("@no-email.roomify.com")) return false;
        return userRepository.existsByEmailFlexible(email.trim(), currentUserId);
    }
}