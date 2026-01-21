package com.roomify.service;

import com.roomify.dto.PropertyRequest;
import com.roomify.model.*;
import com.roomify.model.enums.LayoutType;
import com.roomify.model.enums.PreferredTenantType;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

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
    private final UserRepository userRepository;
    private final PreferencesRepository preferencesRepository;
    private final PreferencesService preferencesService;
    private final GeocodingService geocodingService;
    private final Path rootLocation = Paths.get("uploads");
    private static final int MAX_IMAGES = 7;

    public PropertyService(PropertyRepository propertyRepository,
                           MatchRepository matchRepository,
                           UserRepository userRepository,
                           PreferencesRepository preferencesRepository,
                           PreferencesService preferencesService,
                           GeocodingService geocodingService) {
        this.propertyRepository = propertyRepository;
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.preferencesRepository = preferencesRepository;
        this.preferencesService = preferencesService;
        this.geocodingService = geocodingService;
        initStorage();
    }

    private void initStorage() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage", e);
        }
    }

    /**
     * Deletes all properties owned by a landlord, including physical images
     * and associated matches. Called during account deletion.
     */
    @Transactional
    public void deleteAllByLandlord(String landlordId) {
        // Find all properties for this owner ID
        List<Property> properties = propertyRepository.findByOwner_Id(landlordId, Pageable.unpaged()).getContent();

        for (Property property : properties) {
            // Delete associated matches
            matchRepository.deleteByPropertyId(property.getId());

            // Delete physical images
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

        // If user is not a Tenant (Role USER/TENANT), return generic feed to prevent crash
        if (!user.getRole().getName().equals("USER") && !user.getRole().getName().equals("TENANT")) {
            return propertyRepository.findAll(PageRequest.of(0, 20)).getContent();
        }

        // Get user preferences if they exist
        Optional<Preferences> userPreferences = preferencesRepository.findByUserId(userId);

        List<Property> allFeed = propertyRepository.findFeedForTenant(userId);

        // Filter by preferences if they exist
        if (userPreferences.isPresent()) {
            Preferences prefs = userPreferences.get();
            return allFeed.stream()
                    .filter(property -> preferencesService.propertyMatchesPreferences(
                            property.getPrice().doubleValue(),
                            property.getSurface(),
                            property.getNumberOfRooms(),
                            property.getLayoutType() != null ? property.getLayoutType().name() : null,
                            property.getPetFriendly(),
                            property.getSmokerFriendly(),
                            property.getLatitude(),
                            property.getLongitude(),
                            prefs
                    ))
                    .collect(Collectors.toList());
        }

        return allFeed;
    }

    @Transactional
    public Property createProperty(PropertyRequest request, List<MultipartFile> files, String userId) {
        int newFilesCount = (files == null) ? 0 : files.size();

        if (newFilesCount < 1) throw new RuntimeException("Validation Error: You must upload at least one photo.");
        if (newFilesCount > MAX_IMAGES) throw new RuntimeException("Too many images.");

        // FIX: Find by ID (Primary Key) to support Facebook users without emails
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Property property = new Property();
        property.setOwner(owner);

        resolveLocationLogic(request);
        updateEntityFromRequest(property, request);

        List<PropertyImage> newImages = new ArrayList<>();
        if (files != null && !files.isEmpty()) {
            newImages = saveFiles(files, property);
        }

        try {
            property.setImages(new ArrayList<>());
            reorderImages(property, request.getOrderedIdentifiers(), newImages);
            return propertyRepository.save(property);
        } catch (Exception e) {
            for (PropertyImage img : newImages) {
                deleteFileFromDisk(img.getUrl());
            }
            throw e;
        }
    }

    @Transactional
    public Property updateProperty(Long id, PropertyRequest request, List<MultipartFile> newFiles, String userId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        // FIX: Verify ownership using ID
        if (!property.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: You do not own this property");
        }

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
        if (newFiles != null && !newFiles.isEmpty()) {
            newImagesList = saveFiles(newFiles, property);
        }

        try {
            reorderImages(property, request.getOrderedIdentifiers(), newImagesList);

            if (property.getImages().isEmpty()) {
                throw new RuntimeException("Validation Error: You must have at least one photo.");
            }

            return propertyRepository.save(property);
        } catch (Exception e) {
            for (PropertyImage img : newImagesList) {
                deleteFileFromDisk(img.getUrl());
            }
            throw e;
        }
    }

    @Transactional
    public void deleteProperty(Long id, String userId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        // FIX: Verify ownership using ID
        if (!property.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        matchRepository.deleteByPropertyId(property.getId());

        if (property.getImages() != null) {
            for (PropertyImage img : property.getImages()) {
                deleteFileFromDisk(img.getUrl());
            }
        }

        propertyRepository.delete(property);
    }

    // --- HELPERS ---

    private void deleteFileFromDisk(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) return;
        try {
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Path filePath = this.rootLocation.resolve(filename).normalize();
            Files.deleteIfExists(filePath);
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

                originalName = originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
                String filename = UUID.randomUUID().toString() + "_" + originalName;
                Files.copy(file.getInputStream(), this.rootLocation.resolve(filename));

                // FIX: Save ONLY the relative path starting with /api
                // This ensures the database stays clean regardless of your local IP
                String url = "/api/properties/images/" + filename;

                imageEntities.add(PropertyImage.builder()
                        .url(url)
                        .property(property)
                        .build());
            } catch (IOException e) {
                throw new RuntimeException("Failed to store file", e);
            }
        }
        return imageEntities;
    }

    private void reorderImages(Property property, List<String> orderedIdentifiers, List<PropertyImage> newImages) {
        if (property.getImages() == null) property.setImages(new ArrayList<>());

        Map<Long, PropertyImage> existingImageMap = new HashMap<>();
        for (PropertyImage img : property.getImages()) {
            if (img.getId() != null) existingImageMap.put(img.getId(), img);
        }

        List<PropertyImage> reorderedList = new ArrayList<>();
        int orderIndex = 0;
        int newImagePointer = 0;

        if (orderedIdentifiers != null) {
            for (String identifier : orderedIdentifiers) {
                if (identifier.startsWith("ID_")) {
                    try {
                        Long id = Long.parseLong(identifier.substring(3));
                        PropertyImage img = existingImageMap.get(id);
                        if (img != null) {
                            img.setOrderIndex(orderIndex++);
                            reorderedList.add(img);
                            existingImageMap.remove(id);
                        }
                    } catch (NumberFormatException ignored) {}
                } else if (identifier.startsWith("NEW_")) {
                    if (newImagePointer < newImages.size()) {
                        PropertyImage img = newImages.get(newImagePointer++);
                        img.setOrderIndex(orderIndex++);
                        img.setProperty(property);
                        reorderedList.add(img);
                    }
                }
            }
        }

        existingImageMap.values().forEach(img -> {
            img.setOrderIndex(reorderedList.size());
            reorderedList.add(img);
        });

        while (newImagePointer < newImages.size()) {
            PropertyImage img = newImages.get(newImagePointer++);
            img.setOrderIndex(reorderedList.size());
            img.setProperty(property);
            reorderedList.add(img);
        }

        property.getImages().clear();
        property.getImages().addAll(reorderedList);
    }

    private void resolveLocationLogic(PropertyRequest request) {
        GeocodingService.LocationResult result = geocodingService.resolveLocation(
                request.getAddress(),
                request.getLatitude(),
                request.getLongitude()
        );
        request.setAddress(result.address);
        request.setLatitude(result.latitude);
        request.setLongitude(result.longitude);

        if (request.getAddress() == null || request.getAddress().isBlank()) {
            throw new RuntimeException("Address is required.");
        }
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
            Set<PreferredTenantType> tenantPrefs = request.getPreferredTenants().stream()
                    .map(t -> { try { return PreferredTenantType.fromDisplayName(t.trim()); } catch (Exception e) { return null; } })
                    .filter(Objects::nonNull).collect(Collectors.toSet());
            property.setPreferredTenants(tenantPrefs);
        }
    }
}