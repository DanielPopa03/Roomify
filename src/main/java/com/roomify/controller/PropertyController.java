package com.roomify.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomify.dto.PropertyRequest;
import com.roomify.model.Property;
import com.roomify.service.PropertyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;

    // FIX: Initialize manually to avoid "Bean not found" error
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    // 1. CREATE PROPERTY (With Images)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProperty(
            @RequestPart("data") String propertyRequestString,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest request
    ) {

        // Debug logging
        System.out.println("=== CREATE PROPERTY DEBUG ===");

        // Log all multipart parts
        try {
            for (Part part : request.getParts()) {
                System.out.println("Part name: " + part.getName() + ", size: " + part.getSize() + ", content-type: " + part.getContentType());
            }
        } catch (Exception e) {
            System.out.println("Error reading parts: " + e.getMessage());
        }

        // --- 1. SAFE JSON PARSING ---
        PropertyRequest propertyRequest;
        try {
            // Manual parsing uses the instance created above
            propertyRequest = objectMapper.readValue(propertyRequestString, PropertyRequest.class);
        } catch (JsonProcessingException e) {
            // Log to console without emojis
            System.err.println("[Error] JSON Parsing Error in Create Property: " + e.getMessage());

            // Return 400 Bad Request to the frontend
            return ResponseEntity.badRequest()
                    .body("Invalid data format: Please check your inputs (e.g., ensure Price is a number).");
        }

        // --- 2. SERVICE LOGIC ---
        try {
            String userId = jwt.getSubject();
            Property savedProperty = propertyService.createProperty(propertyRequest, images, userId);
            return ResponseEntity.ok(savedProperty);
        } catch (RuntimeException e) {
            // Catch business logic errors (like validation or file issues)
            System.err.println("[Error] Service Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. UPDATE PROPERTY (With Images)
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProperty(
            @PathVariable Long id,
            @RequestPart("data") String propertyRequestString,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt
    ) {

        // --- 1. SAFE JSON PARSING ---
        PropertyRequest request;
        try {
            request = objectMapper.readValue(propertyRequestString, PropertyRequest.class);
        } catch (JsonProcessingException e) {
            System.err.println("[Error] JSON Parsing Error in Update Property: " + e.getMessage());
            return ResponseEntity.badRequest()
                    .body("Invalid data format: Please check your inputs.");
        }

        // --- 2. SERVICE LOGIC ---
        try {
            String userId = jwt.getSubject();
            Property updatedProperty = propertyService.updateProperty(id, request, images, userId);
            return ResponseEntity.ok(updatedProperty);
        } catch (RuntimeException e) {
            System.err.println("[Error] Service Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 3. SERVE IMAGES
    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path file = Paths.get("uploads").resolve(filename);
            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_JPEG) // <--- FORCE BROWSER TO RENDER AS IMAGE
                        .body(resource);
            } else {
                throw new RuntimeException("Could not read file: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error: " + e.getMessage());
        }
    }

    // 4. GET MY PROPERTIES (Landlord)
    @GetMapping("/my")
    public ResponseEntity<Page<Property>> getMyProperties(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String userId = jwt.getSubject();
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(propertyService.getPropertiesByUser(userId, pageable));
    }

    // 5. GET ALL PROPERTIES (For tenants to browse/swipe)
    @GetMapping
    public ResponseEntity<Page<Property>> getAllProperties(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(propertyService.getAllProperties(pageable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProperty(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        propertyService.deleteProperty(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Property> getPropertyById(@PathVariable Long id) {
        return ResponseEntity.ok(propertyService.getPropertyById(id));
    }
}