package com.roomify.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomify.dto.PropertyRequest;
import com.roomify.model.Property;
import com.roomify.service.PropertyService;
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
    public ResponseEntity<Property> createProperty(
            @RequestPart("data") String propertyRequestString,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt
    ) throws JsonProcessingException {

        // Manual parsing uses the instance created above
        PropertyRequest request = objectMapper.readValue(propertyRequestString, PropertyRequest.class);

        String userId = jwt.getSubject();
        Property savedProperty = propertyService.createProperty(request, images, userId);
        return ResponseEntity.ok(savedProperty);
    }

    // 2. UPDATE PROPERTY (With Images)
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Property> updateProperty(
            @PathVariable Long id,
            @RequestPart("data") String propertyRequestString,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt
    ) throws JsonProcessingException {

        PropertyRequest request = objectMapper.readValue(propertyRequestString, PropertyRequest.class);
        String userId = jwt.getSubject();

        Property updatedProperty = propertyService.updateProperty(id, request, images, userId);
        return ResponseEntity.ok(updatedProperty);
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

    // 4. GET MY PROPERTIES
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