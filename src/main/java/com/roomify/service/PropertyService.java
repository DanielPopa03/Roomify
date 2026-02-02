package com.roomify.service;

import com.roomify.dto.PropertyFeedResponse;
import com.roomify.dto.PropertyRequest;
import com.roomify.model.*;
import com.roomify.model.enums.LayoutType;
import com.roomify.model.enums.MatchStatus;
import com.roomify.model.enums.PreferredTenantType;
import com.roomify.repository.ChatMessageRepository;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.PreferencesRepository;
import com.roomify.repository.PropertyRepository;
import com.roomify.repository.UserRepository;
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
    private final Path rootLocation = Paths.get("uploads");
    private static final int MAX_IMAGES = 7;

    public PropertyService(PropertyRepository propertyRepository,
                           MatchRepository matchRepository,
                           ChatMessageRepository chatMessageRepository,
                           UserRepository userRepository,
                           PreferencesRepository preferencesRepository,
                           PreferencesService preferencesService,
                           GeocodingService geocodingService) {
        this.propertyRepository = propertyRepository;
        this.matchRepository = matchRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.preferencesRepository = preferencesRepository;
        this.preferencesService = preferencesService;
        this.geocodingService = geocodingService;
        initStorage();
    }

    private void initStorage() {
        try { Files.createDirectories(rootLocation); } catch (IOException e) { throw new RuntimeException(e); }
    }

    // --- FEED LOGIC (UPDATED RETURN TYPE) ---

    public List<PropertyFeedResponse> getFeedForUser(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        // If admin/landlord, just return everything mapped to DTO (simplified)
        if (user.getRole() != null &&
                (!"USER".equalsIgnoreCase(user.getRole().getName()) &&
                        !"TENANT".equalsIgnoreCase(user.getRole().getName()))) {
            return propertyRepository.findAll(PageRequest.of(0, 20)).getContent()
                    .stream()
                    .map(this::mapToFeedResponse)
                    .collect(Collectors.toList());
        }

        List<Match> history = matchRepository.findAllByTenant_Id(userId);

        Set<Long> hiddenPropertyIds = history.stream()
                .filter(m -> m.getStatus() == MatchStatus.MATCHED || m.getStatus() == MatchStatus.TENANT_LIKED)
                .map(m -> m.getProperty().getId())
                .collect(Collectors.toSet());

        Map<Long, Double> historicalScores = history.stream()
                .collect(Collectors.toMap(m -> m.getProperty().getId(), Match::getScore, (s1, s2) -> s1));

        Optional<Preferences> userPreferences = preferencesRepository.findByUserId(userId);

        List<Property> candidates = propertyRepository.findAll().stream()
                .filter(p -> !hiddenPropertyIds.contains(p.getId()))
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
                                prefs
                        );
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

        // CONVERT TO DTO
        return sortedFeed.stream()
                .map(this::mapToFeedResponse)
                .collect(Collectors.toList());
    }

    // --- MAPPING HELPER ---
    private PropertyFeedResponse mapToFeedResponse(Property property) {
        PropertyFeedResponse response = new PropertyFeedResponse();

        response.setId(property.getId());
        response.setTitle(property.getTitle());
        response.setPrice(property.getPrice());
        response.setSurface(property.getSurface());
        response.setAddress(property.getAddress());
        response.setDescription(property.getDescription());
        response.setNumberOfRooms(property.getNumberOfRooms());
        response.setHasExtraBathroom(property.getHasExtraBathroom());
        response.setLayoutType(property.getLayoutType());
        response.setPreferredTenants(property.getPreferredTenants());
        response.setSmokerFriendly(property.getSmokerFriendly());
        response.setPetFriendly(property.getPetFriendly());
        response.setLatitude(property.getLatitude());
        response.setLongitude(property.getLongitude());

        if (property.getImages() != null) {
            List<PropertyFeedResponse.ImageDto> imageDtos = property.getImages().stream()
                    .map(img -> {
                        PropertyFeedResponse.ImageDto dto = new PropertyFeedResponse.ImageDto();
                        dto.setId(img.getId());
                        dto.setUrl(img.getUrl());
                        dto.setOrderIndex(img.getOrderIndex());
                        return dto;
                    })
                    .sorted(Comparator.comparingInt(PropertyFeedResponse.ImageDto::getOrderIndex))
                    .collect(Collectors.toList());
            response.setImages(imageDtos);
        }

        // Map Owner Details for Frontend Navigation
        if (property.getOwner() != null) {
            response.setOwnerId(property.getOwner().getId());
            response.setOwnerFirstName(property.getOwner().getFirstName());
            response.setOwnerPicture(property.getOwner().getPicture());
        }

        return response;
    }

    private double calculateMatchScore(User tenant, Property property) {
        double score = 50.0;

        if (Boolean.TRUE.equals(tenant.getHasPets()) && Boolean.FALSE.equals(property.getPetFriendly())) {
            return -100.0;
        }
        if (Boolean.TRUE.equals(tenant.getIsSmoker()) && Boolean.FALSE.equals(property.getSmokerFriendly())) {
            return -100.0;
        }

        if (property.getPreferredTenants() != null && !property.getPreferredTenants().isEmpty()) {
            if (tenant.getTenantType() != null) {
                boolean isAccepted = property.getPreferredTenants().contains(tenant.getTenantType());
                if (!isAccepted) {
                    score -= 20.0;
                } else {
                    score += 20.0;
                }
            }
        }

        int desiredRooms = tenant.getMinRooms() != null ? tenant.getMinRooms() : 1;
        if (property.getNumberOfRooms() >= desiredRooms) {
            score += 15.0;
            if (property.getNumberOfRooms() == desiredRooms) score += 5.0;
        } else {
            score -= 15.0;
        }

        if (Boolean.TRUE.equals(tenant.getWantsExtraBathroom())) {
            if (Boolean.TRUE.equals(property.getHasExtraBathroom())) score += 10.0;
            else score -= 5.0;
        }

        return score;
    }

    // --- CRUD OPERATIONS (UNCHANGED) ---

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

    @Transactional
    public Property createProperty(PropertyRequest request, List<MultipartFile> files, String userId) {
        int newFilesCount = (files == null) ? 0 : files.size();
        if (newFilesCount < 1) throw new RuntimeException("Validation Error: Upload at least one photo.");
        if (newFilesCount > MAX_IMAGES) throw new RuntimeException("Too many images.");

        User owner = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Property property = new Property();
        property.setOwner(owner);

        resolveLocationLogic(request);
        updateEntityFromRequest(property, request);

        List<PropertyImage> newImages = new ArrayList<>();
        if (files != null && !files.isEmpty()) newImages = saveFiles(files, property);

        try {
            property.setImages(new ArrayList<>());
            reorderImages(property, request.getOrderedIdentifiers(), newImages);
            return propertyRepository.save(property);
        } catch (Exception e) {
            for (PropertyImage img : newImages) deleteFileFromDisk(img.getUrl());
            throw e;
        }
    }

    @Transactional
    public Property updateProperty(Long id, PropertyRequest request, List<MultipartFile> newFiles, String userId) {
        Property property = propertyRepository.findById(id).orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwner().getId().equals(userId)) throw new RuntimeException("Unauthorized");

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
        if (newFiles != null && !newFiles.isEmpty()) newImagesList = saveFiles(newFiles, property);

        try {
            reorderImages(property, request.getOrderedIdentifiers(), newImagesList);
            if (property.getImages().isEmpty()) throw new RuntimeException("Must have one photo.");
            return propertyRepository.save(property);
        } catch (Exception e) {
            for (PropertyImage img : newImagesList) deleteFileFromDisk(img.getUrl());
            throw e;
        }
    }

    @Transactional
    public void deleteProperty(Long id, String userId) {
        Property property = propertyRepository.findById(id).orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwner().getId().equals(userId)) throw new RuntimeException("Unauthorized");

        List<Match> matches = matchRepository.findAll().stream()
                .filter(m -> m.getProperty().getId().equals(property.getId()))
                .collect(Collectors.toList());

        for (Match match : matches) {
            chatMessageRepository.deleteAll(chatMessageRepository.findByMatchIdOrderByCreatedAtAsc(match.getId()));
        }

        matchRepository.deleteByPropertyId(property.getId());
        if (property.getImages() != null) {
            for (PropertyImage img : property.getImages()) deleteFileFromDisk(img.getUrl());
        }
        propertyRepository.delete(property);
    }

    private void deleteFileFromDisk(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) return;
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
                if (originalName == null || originalName.isBlank()) originalName = "photo.jpg";
                String filename = UUID.randomUUID().toString() + "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
                Files.copy(file.getInputStream(), this.rootLocation.resolve(filename));
                imageEntities.add(PropertyImage.builder().url("/api/properties/images/" + filename).property(property).build());
            } catch (IOException e) {
                throw new RuntimeException("Failed to store file", e);
            }
        }
        return imageEntities;
    }

    private void reorderImages(Property property, List<String> orderedIdentifiers, List<PropertyImage> newImages) {
        if (property.getImages() == null) property.setImages(new ArrayList<>());
        Map<Long, PropertyImage> existingMap = new HashMap<>();
        for (PropertyImage img : property.getImages()) if (img.getId() != null) existingMap.put(img.getId(), img);

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
                    } catch (NumberFormatException ignored) {}
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
        GeocodingService.LocationResult result = geocodingService.resolveLocation(request.getAddress(), request.getLatitude(), request.getLongitude());
        request.setAddress(result.address);
        request.setLatitude(result.latitude);
        request.setLongitude(result.longitude);
        if (request.getAddress() == null || request.getAddress().isBlank()) throw new RuntimeException("Address required.");
    }

    public Page<Property> getPropertiesByUser(String userId, Pageable pageable) {
        return propertyRepository.findByOwner_Id(userId, pageable);
    }

    public Page<Property> getAllProperties(Pageable pageable) {
        return propertyRepository.findAll(pageable);
    }

    public Property getPropertyById(Long id) {
        return propertyRepository.findById(id).orElseThrow(() -> new RuntimeException("Property not found"));
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
            try { property.setLayoutType(LayoutType.valueOf(request.getLayoutType().trim().toUpperCase())); }
            catch (IllegalArgumentException ignored) {}
        }

        if (request.getPreferredTenants() != null) {
            Set<PreferredTenantType> prefs = request.getPreferredTenants().stream()
                    .map(t -> {
                        try { return PreferredTenantType.fromDisplayName(t.trim()); }
                        catch (Exception e) { return null; }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            property.setPreferredTenants(prefs);
        }
    }
}