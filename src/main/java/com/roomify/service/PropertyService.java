package com.roomify.service;

import com.roomify.dto.PropertyRequest;
import com.roomify.model.*;
import com.roomify.model.enums.LayoutType;
import com.roomify.model.enums.LeaseStatus;
import com.roomify.model.enums.MatchStatus;
import com.roomify.model.enums.PreferredTenantType;
import com.roomify.repository.ChatMessageRepository;
import com.roomify.repository.LeaseAgreementRepository;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.PreferencesRepository;
import com.roomify.repository.PropertyRepository;
import com.roomify.repository.PropertyViewRepository;
import com.roomify.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final MatchRepository matchRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final PreferencesRepository preferencesRepository;
    private final PreferencesService preferencesService;
    private final GeocodingService geocodingService;
    private final PropertyViewRepository propertyViewRepository;
    private final LeaseAgreementRepository leaseAgreementRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private final Path rootLocation = Paths.get("uploads");
    private static final int MAX_IMAGES = 7;

    // --- SOCIAL PROOF THRESHOLDS ---
    private static final int ACTIVE_VIEWERS_WINDOW_MINUTES = 15;
    private static final int TRENDING_WINDOW_HOURS = 48;
    private static final int TRENDING_LIKES_THRESHOLD = 1; // TODO: Change back to 5 for production
    private static final int VIEW_DEDUP_WINDOW_MINUTES = 5;

    public PropertyService(PropertyRepository propertyRepository,
            MatchRepository matchRepository,
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            PreferencesRepository preferencesRepository,
            PreferencesService preferencesService,
            GeocodingService geocodingService,
            PropertyViewRepository propertyViewRepository,
            LeaseAgreementRepository leaseAgreementRepository) {
        this.propertyRepository = propertyRepository;
        this.matchRepository = matchRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.preferencesRepository = preferencesRepository;
        this.preferencesService = preferencesService;
        this.geocodingService = geocodingService;
        this.propertyViewRepository = propertyViewRepository;
        this.leaseAgreementRepository = leaseAgreementRepository;
        initStorage();
    }

    private void initStorage() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Transactional
    public void deleteAllByLandlord(String landlordId) {
        List<Property> properties = propertyRepository.findByOwner_Id(landlordId, Pageable.unpaged()).getContent();
        for (Property property : properties) {
            List<Match> matches = matchRepository.findAll().stream()
                    .filter(m -> m.getProperty().getId().equals(property.getId()))
                    .collect(Collectors.toList());

            for (Match match : matches) {
                chatMessageRepository.deleteAll(chatMessageRepository.findByMatchIdOrderByCreatedAtAsc(match.getId()));
            }
            matchRepository.deleteByPropertyId(property.getId());
            if (property.getImages() != null) {
                for (PropertyImage img : property.getImages()) {
                    deleteFileFromDisk(img.getUrl());
                }
            }
            propertyRepository.delete(property);
        }
    }

    public List<Property> getFeedForUser(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != null &&
                (!"USER".equalsIgnoreCase(user.getRole().getName()) &&
                        !"TENANT".equalsIgnoreCase(user.getRole().getName()))) {
            return propertyRepository.findAll(PageRequest.of(0, 20)).getContent();
        }

        List<Match> history = matchRepository.findAllByTenant_Id(userId);

        Set<Long> hiddenPropertyIds = history.stream()
                .filter(m -> m.getStatus() == MatchStatus.MATCHED || m.getStatus() == MatchStatus.TENANT_LIKED)
                .map(m -> m.getProperty().getId())
                .collect(Collectors.toSet());

        // Get IDs of properties that are already rented (have ACTIVE lease)
        Set<Long> rentedPropertyIds = new HashSet<>(
                leaseAgreementRepository.findPropertyIdsByLeaseStatus(LeaseStatus.ACTIVE));

        Map<Long, Double> historicalScores = history.stream()
                .collect(Collectors.toMap(m -> m.getProperty().getId(), Match::getScore, (s1, s2) -> s1));

        Optional<Preferences> userPreferences = preferencesRepository.findByUserId(userId);

        List<Property> candidates = propertyRepository.findAll().stream()
                .filter(p -> !hiddenPropertyIds.contains(p.getId()))
                .filter(p -> !rentedPropertyIds.contains(p.getId())) // Exclude rented properties
                .filter(p -> !p.getOwner().getId().equals(userId))
                .filter(p -> {
                    if (userPreferences.isPresent()) {
                        Preferences prefs = userPreferences.get();
                        return preferencesService.propertyMatchesPreferences(
                                p.getPrice().doubleValue(),
                                p.getSurface(),
                                p.getNumberOfRooms(),
                                p.getLayoutType() != null ? p.getLayoutType().name() : null,
                                p.getPetFriendly(),
                                p.getSmokerFriendly(),
                                p.getLatitude(),
                                p.getLongitude(),
                                prefs);
                    }
                    return true;
                })
                .collect(Collectors.toList());

        Map<Long, Double> scores = new HashMap<>();
        double VISIBILITY_THRESHOLD = 0.0;

        for (Property p : candidates) {
            double attributeScore = calculateMatchScore(user, p);
            double historyScore = historicalScores.getOrDefault(p.getId(), 0.0);

            double totalScore = attributeScore + historyScore;

            if (totalScore >= VISIBILITY_THRESHOLD) {
                scores.put(p.getId(), totalScore);
            }
        }

        List<Property> sortedFeed = candidates.stream()
                .filter(p -> scores.containsKey(p.getId()))
                .sorted((p1, p2) -> Double.compare(scores.get(p2.getId()), scores.get(p1.getId())))
                .collect(Collectors.toList());

        if (sortedFeed.size() > 10) {
            int bottomHalfStart = sortedFeed.size() / 2;
            for (int i = 4; i < bottomHalfStart; i += 5) {
                int swapIndex = bottomHalfStart + (int) (Math.random() * (sortedFeed.size() - bottomHalfStart));
                Collections.swap(sortedFeed, i, swapIndex);
            }
        }

        // --- POPULATE TRENDING (batch query to avoid N+1) ---
        populateTrendingFlags(sortedFeed);
        populateActiveViewers(sortedFeed);

        return sortedFeed;
    }

    private double calculateMatchScore(User tenant, Property property) {
        double score = 50.0; // Base Score

        // 1. Pets (HARD Filter - Dealbreaker)
        if (Boolean.TRUE.equals(tenant.getHasPets()) && Boolean.FALSE.equals(property.getPetFriendly())) {
            return -100.0;
        }

        // 2. Smoking (HARD Filter - Dealbreaker)
        if (Boolean.TRUE.equals(tenant.getIsSmoker()) && Boolean.FALSE.equals(property.getSmokerFriendly())) {
            return -100.0;
        }

        // 3. Tenant Type (SOFT Filter - Penalty)
        // UPDATED: Now subtracts 20 points instead of returning -100
        if (property.getPreferredTenants() != null && !property.getPreferredTenants().isEmpty()) {
            if (tenant.getTenantType() != null) {
                boolean isAccepted = property.getPreferredTenants().contains(tenant.getTenantType());

                if (!isAccepted) {
                    score -= 20.0; // Penalty (Not target demographic), but still visible
                } else {
                    score += 20.0; // Bonus (Perfect demographic)
                }
            }
        }

        // 4. Rooms
        int desiredRooms = tenant.getMinRooms() != null ? tenant.getMinRooms() : 1;
        if (property.getNumberOfRooms() >= desiredRooms) {
            score += 15.0;
            if (property.getNumberOfRooms() == desiredRooms)
                score += 5.0;
        } else {
            score -= 15.0;
        }

        // 5. Bathroom
        if (Boolean.TRUE.equals(tenant.getWantsExtraBathroom())) {
            if (Boolean.TRUE.equals(property.getHasExtraBathroom()))
                score += 10.0;
            else
                score -= 5.0;
        }

        return score;
    }

    // --- CRUD ---

    @Transactional
    public Property createProperty(PropertyRequest request, List<MultipartFile> files, String userId) {
        int newFilesCount = (files == null) ? 0 : files.size();
        if (newFilesCount < 1)
            throw new RuntimeException("Validation Error: Upload at least one photo.");
        if (newFilesCount > MAX_IMAGES)
            throw new RuntimeException("Too many images.");

        User owner = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Property property = new Property();
        property.setOwner(owner);

        resolveLocationLogic(request);
        updateEntityFromRequest(property, request);

        List<PropertyImage> newImages = new ArrayList<>();
        if (files != null && !files.isEmpty())
            newImages = saveFiles(files, property);

        try {
            property.setImages(new ArrayList<>());
            reorderImages(property, request.getOrderedIdentifiers(), newImages);
            return propertyRepository.save(property);
        } catch (Exception e) {
            for (PropertyImage img : newImages)
                deleteFileFromDisk(img.getUrl());
            throw e;
        }
    }

    @Transactional
    public Property updateProperty(Long id, PropertyRequest request, List<MultipartFile> newFiles, String userId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwner().getId().equals(userId))
            throw new RuntimeException("Unauthorized");

        updateEntityFromRequest(property, request);

        if (request.getDeletedImageIds() != null && !request.getDeletedImageIds().isEmpty()) {
            List<PropertyImage> imagesToDelete = property.getImages().stream()
                    .filter(img -> request.getDeletedImageIds().contains(img.getId()))
                    .collect(Collectors.toList());
            for (PropertyImage img : imagesToDelete) {
                deleteFileFromDisk(img.getUrl());
                property.getImages().remove(img);
            }
        }

        List<PropertyImage> newImagesList = new ArrayList<>();
        if (newFiles != null && !newFiles.isEmpty())
            newImagesList = saveFiles(newFiles, property);

        try {
            reorderImages(property, request.getOrderedIdentifiers(), newImagesList);
            if (property.getImages().isEmpty())
                throw new RuntimeException("Must have one photo.");
            return propertyRepository.save(property);
        } catch (Exception e) {
            for (PropertyImage img : newImagesList)
                deleteFileFromDisk(img.getUrl());
            throw e;
        }
    }

    @Transactional
    public void deleteProperty(Long id, String userId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwner().getId().equals(userId))
            throw new RuntimeException("Unauthorized");

        // Delete chat messages for all matches related to this property
        List<Match> matches = matchRepository.findAll().stream()
                .filter(m -> m.getProperty().getId().equals(property.getId()))
                .collect(Collectors.toList());

        for (Match match : matches) {
            chatMessageRepository.deleteAll(chatMessageRepository.findByMatchIdOrderByCreatedAtAsc(match.getId()));
        }

        // Delete associated matches
        matchRepository.deleteByPropertyId(property.getId());
        if (property.getImages() != null) {
            for (PropertyImage img : property.getImages())
                deleteFileFromDisk(img.getUrl());
        }
        propertyRepository.delete(property);
    }

    private void deleteFileFromDisk(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty())
            return;
        try {
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Files.deleteIfExists(this.rootLocation.resolve(filename));
        } catch (IOException e) {
            System.err.println("Warning: Could not delete file: " + fileUrl);
        }
    }

    private List<PropertyImage> saveFiles(List<MultipartFile> files, Property property) {
        List<PropertyImage> imageEntities = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                String originalName = file.getOriginalFilename();
                if (originalName == null || originalName.isBlank())
                    originalName = "photo.jpg";
                String filename = UUID.randomUUID().toString() + "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
                Files.copy(file.getInputStream(), this.rootLocation.resolve(filename));
                imageEntities.add(
                        PropertyImage.builder().url("/api/properties/images/" + filename).property(property).build());
            } catch (IOException e) {
                throw new RuntimeException("Failed to store file", e);
            }
        }
        return imageEntities;
    }

    private void reorderImages(Property property, List<String> orderedIdentifiers, List<PropertyImage> newImages) {
        if (property.getImages() == null)
            property.setImages(new ArrayList<>());
        Map<Long, PropertyImage> existingMap = new HashMap<>();
        for (PropertyImage img : property.getImages())
            if (img.getId() != null)
                existingMap.put(img.getId(), img);

        List<PropertyImage> reordered = new ArrayList<>();
        int orderIndex = 0;
        int newPointer = 0;

        if (orderedIdentifiers != null) {
            for (String idStr : orderedIdentifiers) {
                if (idStr.startsWith("ID_")) {
                    try {
                        Long id = Long.parseLong(idStr.substring(3));
                        PropertyImage img = existingMap.get(id);
                        if (img != null) {
                            img.setOrderIndex(orderIndex++);
                            reordered.add(img);
                            existingMap.remove(id);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                } else if (idStr.startsWith("NEW_") && newPointer < newImages.size()) {
                    PropertyImage img = newImages.get(newPointer++);
                    img.setOrderIndex(orderIndex++);
                    img.setProperty(property);
                    reordered.add(img);
                }
            }
        }

        for (PropertyImage img : existingMap.values()) {
            img.setOrderIndex(reordered.size());
            reordered.add(img);
        }
        while (newPointer < newImages.size()) {
            PropertyImage img = newImages.get(newPointer++);
            img.setOrderIndex(reordered.size());
            img.setProperty(property);
            reordered.add(img);
        }

        property.getImages().clear();
        property.getImages().addAll(reordered);
    }

    private void resolveLocationLogic(PropertyRequest request) {
        GeocodingService.LocationResult result = geocodingService.resolveLocation(request.getAddress(),
                request.getLatitude(), request.getLongitude());
        request.setAddress(result.address);
        request.setLatitude(result.latitude);
        request.setLongitude(result.longitude);
        if (request.getAddress() == null || request.getAddress().isBlank())
            throw new RuntimeException("Address required.");
    }

    public Page<Property> getPropertiesByUser(String userId, Pageable pageable) {
        return propertyRepository.findByOwner_Id(userId, pageable);
    }

    /**
     * Check if a property has been rented (has an ACTIVE lease).
     */
    public boolean isPropertyRented(Long propertyId) {
        List<Long> rentedIds = leaseAgreementRepository.findPropertyIdsByLeaseStatus(LeaseStatus.ACTIVE);
        return rentedIds.contains(propertyId);
    }

    /**
     * Get all rented property IDs (for batch checks).
     */
    public Set<Long> getRentedPropertyIds() {
        return new HashSet<>(leaseAgreementRepository.findPropertyIdsByLeaseStatus(LeaseStatus.ACTIVE));
    }

    public Page<Property> getAllProperties(Pageable pageable) {
        return propertyRepository.findAll(pageable);
    }

    /**
     * Get property by ID with social proof metrics.
     * Note: viewerId is optional - if null, metrics are calculated but view is not
     * logged.
     */
    public Property getPropertyById(Long id) {
        return getPropertyById(id, null);
    }

    /**
     * Get property by ID, log view, and calculate social proof metrics.
     * 
     * @param id       Property ID
     * @param viewerId Auth0 subject ID of the viewer (null for anonymous/internal
     *                 calls)
     */
    @Transactional
    public Property getPropertyById(Long id, String viewerId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        // Detach entity to safely set @Transient fields without Hibernate issues
        entityManager.detach(property);

        // 1. Log the view (with deduplication)
        if (viewerId != null && !viewerId.isBlank()) {
            logPropertyView(property, viewerId);
        }

        // 2. Calculate Active Viewers (last 15 minutes)
        LocalDateTime viewersCutoff = LocalDateTime.now().minusMinutes(ACTIVE_VIEWERS_WINDOW_MINUTES);
        int activeViewers = propertyViewRepository.countActiveViewers(id, viewersCutoff);
        property.setActiveViewersCount(activeViewers);

        // 3. Calculate Trending (likes in last 48 hours)
        LocalDateTime trendingCutoff = LocalDateTime.now().minusHours(TRENDING_WINDOW_HOURS);
        int recentLikes = matchRepository.countRecentLikes(id, trendingCutoff);
        property.setIsTrending(recentLikes >= TRENDING_LIKES_THRESHOLD);

        return property;
    }

    /**
     * Log a property view with 5-minute deduplication.
     */
    private void logPropertyView(Property property, String viewerId) {
        LocalDateTime dedupCutoff = LocalDateTime.now().minusMinutes(VIEW_DEDUP_WINDOW_MINUTES);

        // Check if view already exists within dedup window
        boolean exists = propertyViewRepository.existsRecentView(
                property.getId(),
                viewerId,
                dedupCutoff);

        if (!exists) {
            PropertyView view = PropertyView.builder()
                    .property(property)
                    .viewerId(viewerId)
                    .build();
            propertyViewRepository.save(view);
        }
    }

    /**
     * Batch populate trending flags for a list of properties.
     * Uses single query to avoid N+1 performance issues.
     */
    private void populateTrendingFlags(List<Property> properties) {
        if (properties.isEmpty())
            return;

        List<Long> propertyIds = properties.stream()
                .map(Property::getId)
                .collect(Collectors.toList());

        LocalDateTime trendingCutoff = LocalDateTime.now().minusHours(TRENDING_WINDOW_HOURS);
        List<Object[]> likeCounts = matchRepository.countRecentLikesForProperties(propertyIds, trendingCutoff);

        // Build map: propertyId -> likeCount
        Map<Long, Long> likeCountMap = likeCounts.stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]));

        // Set trending flag on each property
        for (Property p : properties) {
            Long likes = likeCountMap.getOrDefault(p.getId(), 0L);
            p.setIsTrending(likes >= TRENDING_LIKES_THRESHOLD);
        }
    }

    private void populateActiveViewers(List<Property> properties) {
        if (properties.isEmpty())
            return;

        List<Long> propertyIds = properties.stream()
                .map(Property::getId)
                .collect(Collectors.toList());

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(ACTIVE_VIEWERS_WINDOW_MINUTES);
        List<Object[]> counts = propertyViewRepository.countActiveViewersForProperties(propertyIds, cutoff);

        // Build map: propertyId -> viewerCount
        Map<Long, Integer> countMap = counts.stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).intValue()));

        for (Property p : properties) {
            p.setActiveViewersCount(countMap.getOrDefault(p.getId(), 0));
        }
    }

    private void updateEntityFromRequest(Property property, PropertyRequest request) {
        property.setTitle(request.getTitle());
        property.setPrice(request.getPrice());
        property.setSurface(request.getSurface());
        property.setAddress(request.getAddress());
        property.setLatitude(request.getLatitude());
        property.setLongitude(request.getLongitude());
        property.setDescription(request.getDescription());
        property.setNumberOfRooms(request.getNumberOfRooms());
        property.setHasExtraBathroom(request.getHasExtraBathroom() != null ? request.getHasExtraBathroom() : false);
        property.setSmokerFriendly(request.getSmokerFriendly());
        property.setPetFriendly(request.getPetFriendly());

        if (request.getLayoutType() != null) {
            try {
                property.setLayoutType(LayoutType.valueOf(request.getLayoutType().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
            }
        }

        if (request.getPreferredTenants() != null) {
            Set<PreferredTenantType> prefs = request.getPreferredTenants().stream()
                    .map(t -> {
                        try {
                            return PreferredTenantType.fromDisplayName(t.trim());
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            property.setPreferredTenants(prefs);
        }
    }
}