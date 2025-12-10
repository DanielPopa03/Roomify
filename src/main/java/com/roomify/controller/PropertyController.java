package com.roomify.controller;

import com.roomify.dto.PropertyRequest;
import com.roomify.model.Property;
import com.roomify.service.PropertyService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    // 1. CREATE PROPERTY
    @PostMapping
    public ResponseEntity<Property> createProperty(
            @Valid @RequestBody PropertyRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        // --- FIX 1: Extract the ID from the token ---
        String userId = jwt.getSubject();

        // Pass the String ID to the service
        Property savedProperty = propertyService.createProperty(request, userId);
        return ResponseEntity.ok(savedProperty);
    }

    // 2. GET MY PROPERTIES
    // --- FIX 2: Changed URL from "/user/{id}" to "/my" ---
    @GetMapping("/my")
    public ResponseEntity<Page<Property>> getMyProperties(
            @AuthenticationPrincipal Jwt jwt, // Inject the token
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        // --- FIX 3: Extract ID from token (Secure) ---
        String userId = jwt.getSubject();

        Pageable pageable = PageRequest.of(page, size);

        // Call service with String ID (make sure Service accepts String)
        Page<Property> propertiesPage = propertyService.getPropertiesByUser(userId, pageable);

        return ResponseEntity.ok(propertiesPage);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Property> updateProperty(
            @PathVariable Long id,
            @Valid @RequestBody PropertyRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        Property updatedProperty = propertyService.updateProperty(id, request, userId);
        return ResponseEntity.ok(updatedProperty);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProperty(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        propertyService.deleteProperty(id, userId);
        return ResponseEntity.noContent().build(); // Returns 204 No Content
    }

    @GetMapping("/{id}")
    public ResponseEntity<Property> getPropertyById(@PathVariable Long id) {
        // Correct: Call the service, not the repository
        Property property = propertyService.getPropertyById(id);
        return ResponseEntity.ok(property);
    }
}