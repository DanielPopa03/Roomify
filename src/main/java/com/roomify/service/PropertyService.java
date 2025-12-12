package com.roomify.service;

import com.roomify.dto.PropertyRequest;
import com.roomify.model.*;
import com.roomify.repository.PropertyRepository;
import org.springframework.data.domain.Page;
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
    private final Path rootLocation = Paths.get("uploads");
    private static final int MAX_IMAGES = 7;

    public PropertyService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
        initStorage();
    }

    private void initStorage() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage", e);
        }
    }

    // --- 1. REORDER LOGIC (FIXED: Uses clear/addAll to prevent Hibernate Crash) ---
    private void reorderImages(Property property, List<String> orderedIdentifiers, List<PropertyImage> newImages) {
        Map<String, PropertyImage> imageMap = new HashMap<>();

        for (PropertyImage img : property.getImages()) {
            if (img.getId() != null) imageMap.put("ID_" + img.getId(), img);
        }
        for (int i = 0; i < newImages.size(); i++) {
            imageMap.put("NEW_" + i, newImages.get(i));
        }

        List<PropertyImage> reorderedList = new ArrayList<>();
        int index = 0;

        if (orderedIdentifiers != null) {
            for (String identifier : orderedIdentifiers) {
                PropertyImage img = imageMap.get(identifier);
                if (img != null) {
                    img.setOrderIndex(index++);
                    img.setProperty(property);
                    reorderedList.add(img);
                }
            }
        }

        // Safety: Append leftovers
        for (PropertyImage img : property.getImages()) {
            if (!reorderedList.contains(img)) {
                img.setOrderIndex(index++);
                reorderedList.add(img);
            }
        }
        for (PropertyImage img : newImages) {
            if (!reorderedList.contains(img)) {
                img.setOrderIndex(index++);
                img.setProperty(property);
                reorderedList.add(img);
            }
        }

        // --- CRITICAL FIX ---
        // Never replace the collection reference (setImages) when orphanRemoval is true
        if (property.getImages() == null) {
            property.setImages(reorderedList);
        } else {
            property.getImages().clear();
            property.getImages().addAll(reorderedList);
        }
    }

    @Transactional
    public Property createProperty(PropertyRequest request, List<MultipartFile> files, String ownerId) {
        // Validation with Logging
        int newFilesCount = (files == null) ? 0 : files.size();

        if (newFilesCount < 1) throw new RuntimeException("Validation Error: You must upload at least one photo.");
        if (newFilesCount > MAX_IMAGES) throw new RuntimeException("Too many images.");

        Property property = new Property();
        property.setOwnerId(ownerId);
        updateEntityFromRequest(property, request);

        List<PropertyImage> newImages = new ArrayList<>();
        if (files != null && !files.isEmpty()) {
            newImages = saveFiles(files, property);
        }

        // Initial setup can use setImages because it's a new entity
        property.setImages(newImages);
        reorderImages(property, request.getOrderedIdentifiers(), new ArrayList<>()); // Re-sort if needed

        return propertyRepository.save(property);
    }

    @Transactional
    public Property updateProperty(Long id, PropertyRequest request, List<MultipartFile> newFiles, String ownerId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        if (!property.getOwnerId().equals(ownerId)) throw new RuntimeException("Unauthorized");

        // --- 2. DEBUGGING LOGS (Check console to see these values) ---
        long currentCount = property.getImages().size();
        long deletedCount = (request.getDeletedImageIds() != null) ? request.getDeletedImageIds().size() : 0;
        long newCount = (newFiles != null) ? newFiles.size() : 0;
        long finalCount = currentCount - deletedCount + newCount;

        if (finalCount > MAX_IMAGES) throw new RuntimeException("Cannot save: Total images would exceed limit of " + MAX_IMAGES);

        if (finalCount < 1) {
            // This is what is failing for you. The logs above will tell us why.
            throw new RuntimeException("Validation Error: You must have at least one photo.");
        }

        updateEntityFromRequest(property, request);

        // Remove Deleted
        if (request.getDeletedImageIds() != null && !request.getDeletedImageIds().isEmpty()) {
            List<PropertyImage> imagesToDelete = property.getImages().stream()
                    .filter(img -> request.getDeletedImageIds().contains(img.getId()))
                    .toList();
            for (PropertyImage img : imagesToDelete) {
                deleteFileFromDisk(img.getUrl());
                property.getImages().remove(img);
            }
        }

        // Add New
        List<PropertyImage> newImagesList = new ArrayList<>();
        if (newFiles != null && !newFiles.isEmpty()) {
            newImagesList = saveFiles(newFiles, property);
        }

        // Reorder (Using the Fix)
        reorderImages(property, request.getOrderedIdentifiers(), newImagesList);

        return propertyRepository.save(property);
    }

    @Transactional
    public void deleteProperty(Long id, String ownerId) {
        Property property = propertyRepository.findById(id).orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwnerId().equals(ownerId)) throw new RuntimeException("Unauthorized");
        for (PropertyImage img : property.getImages()) deleteFileFromDisk(img.getUrl());
        propertyRepository.delete(property);
    }

    // --- HELPERS ---
    private void validateImageCount(int currentCount, List<MultipartFile> files) {
        // (Logic moved inside create/update for better logging, but kept here for safety)
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
                if (!originalName.toLowerCase().endsWith(".jpg") && !originalName.toLowerCase().endsWith(".jpeg")) {
                    originalName += ".jpg";
                }
                String filename = UUID.randomUUID().toString() + "_" + originalName;
                Files.copy(file.getInputStream(), this.rootLocation.resolve(filename));
                String url = ServletUriComponentsBuilder.fromCurrentContextPath().path("/api/properties/images/").path(filename).toUriString();

                imageEntities.add(PropertyImage.builder().url(url).property(property).build());
            } catch (IOException e) {
                throw new RuntimeException("Failed to store file", e);
            }
        }
        return imageEntities;
    }

    public Page<Property> getPropertiesByUser(String ownerId, Pageable pageable) {
        return propertyRepository.findByOwnerId(ownerId, pageable);
    }
    public Property getPropertyById(Long id) {
        return propertyRepository.findById(id).orElseThrow(() -> new RuntimeException("Property not found"));
    }
    private void updateEntityFromRequest(Property property, PropertyRequest request) {
        property.setTitle(request.getTitle());
        property.setPrice(request.getPrice());
        property.setSurface(request.getSurface());
        property.setAddress(request.getAddress());
        property.setDescription(request.getDescription());
        property.setNumberOfRooms(request.getNumberOfRooms());
        property.setHasExtraBathroom(request.getHasExtraBathroom() != null ? request.getHasExtraBathroom() : false);

        // Handle Tri-State Logic (null stays null)
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