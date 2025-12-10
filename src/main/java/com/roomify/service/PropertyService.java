package com.roomify.service;

import com.roomify.dto.PropertyRequest;
import com.roomify.model.*;
import com.roomify.repository.PropertyRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;

    // We only need the PropertyRepository now since we are storing the ownerId as a String
    public PropertyService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    @Transactional
    public Property createProperty(PropertyRequest request, String ownerId) {

        // 1. Handle LayoutType Safely
        LayoutType layout = null;
        if (request.getLayoutType() != null) {
            try {
                // Remove whitespace and casing issues
                layout = LayoutType.valueOf(request.getLayoutType().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                System.out.println("Warning: Invalid LayoutType: " + request.getLayoutType());
            }
        }

        Set<PreferredTenantType> tenantPrefs = new HashSet<>();
        if (request.getPreferredTenants() != null) {
            tenantPrefs = request.getPreferredTenants().stream()
                    .map(rawString -> {
                        try {
                            // USE YOUR CUSTOM HELPER METHOD HERE
                            // This will now correctly match "Students (Coliving)" -> STUDENTS_COLIVING
                            return PreferredTenantType.fromDisplayName(rawString.trim());
                        } catch (IllegalArgumentException e) {
                            System.out.println("Warning: Could not map tenant type: " + rawString);
                            return null;
                        }
                    })
                    .filter(java.util.Objects::nonNull) // Remove nulls
                    .collect(Collectors.toSet());
        }

        // 3. Build property
        Property property = Property.builder()
                .title(request.getTitle())
                .price(request.getPrice())
                .surface(request.getSurface())
                .address(request.getAddress())
                .description(request.getDescription())
                .numberOfRooms(request.getNumberOfRooms())
                .hasExtraBathroom(request.getHasExtraBathroom() != null ? request.getHasExtraBathroom() : false)
                .smokerFriendly(request.getSmokerFriendly() != null ? request.getSmokerFriendly() : false)
                .petFriendly(request.getPetFriendly() != null ? request.getPetFriendly() : false)
                .layoutType(layout)
                .preferredTenants(tenantPrefs)
                .ownerId(ownerId)
                .build();

        return propertyRepository.save(property);
    }

    // Updated to accept String ownerId (Auth0 ID)
    public Page<Property> getPropertiesByUser(String ownerId, Pageable pageable) {
        return propertyRepository.findByOwnerId(ownerId, pageable);
    }

    @Transactional
    public Property updateProperty(Long id, PropertyRequest request, String ownerId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        // SECURITY CHECK: Ensure the logged-in user owns this property
        if (!property.getOwnerId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized: You do not own this property");
        }

        // Update fields using helper
        updateEntityFromRequest(property, request);

        return propertyRepository.save(property);
    }

    // --- NEW: Delete Property ---
    @Transactional
    public void deleteProperty(Long id, String ownerId) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        if (!property.getOwnerId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized: You do not own this property");
        }

        propertyRepository.delete(property);
    }

    // --- HELPER: Centralize the mapping logic ---
    private void updateEntityFromRequest(Property property, PropertyRequest request) {
        property.setTitle(request.getTitle());
        property.setPrice(request.getPrice());
        property.setSurface(request.getSurface());
        property.setAddress(request.getAddress());
        property.setDescription(request.getDescription());
        property.setNumberOfRooms(request.getNumberOfRooms());
        property.setHasExtraBathroom(request.getHasExtraBathroom() != null ? request.getHasExtraBathroom() : false);
        property.setSmokerFriendly(request.getSmokerFriendly() != null ? request.getSmokerFriendly() : false);
        property.setPetFriendly(request.getPetFriendly() != null ? request.getPetFriendly() : false);

        // Handle Enums Safely
        if (request.getLayoutType() != null) {
            try {
                property.setLayoutType(LayoutType.valueOf(request.getLayoutType().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }

        if (request.getPreferredTenants() != null) {
            Set<PreferredTenantType> tenantPrefs = request.getPreferredTenants().stream()
                    .map(t -> {
                        try { return PreferredTenantType.fromDisplayName(t.trim()); }
                        catch (IllegalArgumentException e) { return null; }
                    })
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toSet());
            property.setPreferredTenants(tenantPrefs);
        }
    }

    public Property getPropertyById(Long id) {
        return propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found with id: " + id));
    }
}