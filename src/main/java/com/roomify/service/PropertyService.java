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
    private final GeocodingService geocodingService;
    private final Path rootLocation = Paths.get("uploads");
    private static final int MAX_IMAGES = 7;

    public PropertyService(PropertyRepository propertyRepository, GeocodingService geocodingService) {
        this.propertyRepository = propertyRepository;
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

    // --- REORDER LOGIC (Unchanged) ---
    private void reorderImages(Property property, List<String> orderedIdentifiers, List<PropertyImage> newImages) {
        if (property.getImages() == null) {
            property.setImages(new ArrayList<>());
        }

        Map<Long, PropertyImage> existingImageMap = new HashMap<>();
        for (PropertyImage img : property.getImages()) {
            if (img.getId() != null) {
                existingImageMap.put(img.getId(), img);
            }
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
                            img.setProperty(property);
                            reorderedList.add(img);
                            existingImageMap.remove(id);
                        }
                    } catch (NumberFormatException ignored) {}
                } else if (identifier.startsWith("NEW_")) {
                    if (newImagePointer < newImages.size()) {
                        PropertyImage img = newImages.get(newImagePointer);
                        img.setOrderIndex(orderIndex++);
                        img.setProperty(property);
                        reorderedList.add(img);
                        newImagePointer++;
                    }
                }
            }
        }

        // Append leftovers to prevent accidental data loss (safety net)
        for (PropertyImage remaining : existingImageMap.values()) {
            remaining.setOrderIndex(orderIndex++);
            reorderedList.add(remaining);
        }

        while (newImagePointer < newImages.size()) {
            PropertyImage img = newImages.get(newImagePointer);
            img.setOrderIndex(orderIndex++);
            img.setProperty(property);
            reorderedList.add(img);
            newImagePointer++;
        }

        if (property.getImages() == null) {
            property.setImages(reorderedList);
        } else {
            property.getImages().clear();
            property.getImages().addAll(reorderedList);
        }
    }

    private void resolveLocationLogic(PropertyRequest request) {
        // Call the geocoding service to fill in the blanks
        GeocodingService.LocationResult result = geocodingService.resolveLocation(
                request.getAddress(),
                request.getLatitude(),
                request.getLongitude()
        );

        // Update the request object with the deduced data
        request.setAddress(result.address);
        request.setLatitude(result.latitude);
        request.setLongitude(result.longitude);

        // Validation: If we still don't have an address, we can't save because DB requires it.
        if (request.getAddress() == null || request.getAddress().isBlank()) {
            throw new RuntimeException("Address is required and could not be deduced from coordinates.");
        }
    }

    @Transactional
    public Property createProperty(PropertyRequest request, List<MultipartFile> files, String ownerId) {
        int newFilesCount = (files == null) ? 0 : files.size();

        if (newFilesCount < 1) throw new RuntimeException("Validation Error: You must upload at least one photo.");
        if (newFilesCount > MAX_IMAGES) throw new RuntimeException("Too many images.");

        Property property = new Property();
        property.setOwnerId(ownerId);

        resolveLocationLogic(request);

        updateEntityFromRequest(property, request);

        // 1. Upload new files
        List<PropertyImage> newImages = new ArrayList<>();
        if (files != null && !files.isEmpty()) {
            newImages = saveFiles(files, property);
        }

        try {
            // 2. Attach and Save
            property.setImages(new ArrayList<>());
            reorderImages(property, request.getOrderedIdentifiers(), newImages);
            return propertyRepository.save(property);

        } catch (Exception e) {
            // ROLLBACK CLEANUP: If DB save fails, delete the files we just uploaded
            // so they don't become orphans.
            for (PropertyImage img : newImages) {
                deleteFileFromDisk(img.getUrl());
            }
            throw e;
        }
    }

    @Transactional
    public Property updateProperty(Long id, PropertyRequest request, List<MultipartFile> newFiles, String ownerId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        if (!property.getOwnerId().equals(ownerId)) throw new RuntimeException("Unauthorized");

        updateEntityFromRequest(property, request);

        // 1. Handle Explicit Deletions FIRST
        if (request.getDeletedImageIds() != null && !request.getDeletedImageIds().isEmpty()) {
            List<PropertyImage> imagesToDelete = property.getImages().stream()
                    .filter(img -> request.getDeletedImageIds().contains(img.getId()))
                    .collect(Collectors.toList());

            for (PropertyImage img : imagesToDelete) {
                // IMMEDIATE CLEANUP: Delete file from disk right now
                deleteFileFromDisk(img.getUrl());
                property.getImages().remove(img);
            }
        }

        // 2. Upload New Files
        List<PropertyImage> newImagesList = new ArrayList<>();
        if (newFiles != null && !newFiles.isEmpty()) {
            newImagesList = saveFiles(newFiles, property);
        }

        try {
            // 3. Reorder and Save
            reorderImages(property, request.getOrderedIdentifiers(), newImagesList);

            if (property.getImages().isEmpty()) {
                throw new RuntimeException("Validation Error: You must have at least one photo.");
            }
            if (property.getImages().size() > MAX_IMAGES) {
                throw new RuntimeException("Cannot save: Total images would exceed limit of " + MAX_IMAGES);
            }

            return propertyRepository.save(property);

        } catch (Exception e) {
            // ROLLBACK CLEANUP: If DB save fails, delete the files we just uploaded.
            // Note: We do NOT restore the files deleted in step 1. Those are gone.
            for (PropertyImage img : newImagesList) {
                deleteFileFromDisk(img.getUrl());
            }
            throw e;
        }
    }

    @Transactional
    public void deleteProperty(Long id, String ownerId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        if (!property.getOwnerId().equals(ownerId)) throw new RuntimeException("Unauthorized");

        // CLEANUP: Delete all associated files from disk
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
            // Parse filename from URL: ".../api/properties/images/uuid_filename.jpg" -> "uuid_filename.jpg"
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Path filePath = this.rootLocation.resolve(filename);

            // Files.deleteIfExists returns true if deleted, false if not found
            boolean deleted = Files.deleteIfExists(filePath);
            if (deleted) {
                System.out.println("Deleted file: " + filename);
            }
        } catch (IOException e) {
            System.err.println("Warning: Could not delete file: " + fileUrl + " (" + e.getMessage() + ")");
            // We do NOT throw exception here, so the DB transaction can still proceed/rollback gracefully
        }
    }

    private List<PropertyImage> saveFiles(List<MultipartFile> files, Property property) {
        List<PropertyImage> imageEntities = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                String originalName = file.getOriginalFilename();
                if (originalName == null || originalName.isBlank()) originalName = "photo.jpg";

                originalName = originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
                if (!originalName.toLowerCase().endsWith(".jpg") && !originalName.toLowerCase().endsWith(".jpeg")) {
                    originalName += ".jpg";
                }

                String filename = UUID.randomUUID().toString() + "_" + originalName;
                Files.copy(file.getInputStream(), this.rootLocation.resolve(filename));

                String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                        .path("/api/properties/images/")
                        .path(filename)
                        .toUriString();

                imageEntities.add(PropertyImage.builder().url(url).property(property).build());
            } catch (IOException e) {
                // If one fails, we should probably stop and throw,
                // which will trigger the rollback in the calling method
                throw new RuntimeException("Failed to store file " + file.getOriginalFilename(), e);
            }
        }
        return imageEntities;
    }

    public Page<Property> getPropertiesByUser(String ownerId, Pageable pageable) {
        return propertyRepository.findByOwnerId(ownerId, pageable);
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

        // 👇 ADD THESE MISSING LINES 👇
        property.setLatitude(request.getLatitude());
        property.setLongitude(request.getLongitude());
        // 👆 This saves the deduced location to the DB 👆

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