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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    // 1. CREATE PROPERTY
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProperty(
            @RequestPart("data") String propertyRequestString,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            PropertyRequest propertyRequest = objectMapper.readValue(propertyRequestString, PropertyRequest.class);
            // FIX: Use jwt.getSubject() (the ID)
            String userId = jwt.getSubject();
            Property savedProperty = propertyService.createProperty(propertyRequest, images, userId);
            return ResponseEntity.ok(savedProperty);
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest().body("Invalid data format.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. UPDATE PROPERTY
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProperty(
            @PathVariable Long id,
            @RequestPart("data") String propertyRequestString,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            PropertyRequest request = objectMapper.readValue(propertyRequestString, PropertyRequest.class);
            // FIX: Use jwt.getSubject() (the ID)
            String userId = jwt.getSubject();
            Property updatedProperty = propertyService.updateProperty(id, request, images, userId);
            return ResponseEntity.ok(updatedProperty);
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest().body("Invalid data format.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 3. GET MY PROPERTIES
    @GetMapping("/my")
    public ResponseEntity<Page<Property>> getMyProperties(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        // FIX: Use jwt.getSubject()
        String userId = jwt.getSubject();
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(propertyService.getPropertiesByUser(userId, pageable));
    }

    // 3b. GET MY PROPERTIES WITH RENTAL STATUS
    @GetMapping("/my/status")
    public ResponseEntity<List<Map<String, Object>>> getMyPropertiesWithStatus(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        String userId = jwt.getSubject();
        Pageable pageable = PageRequest.of(page, size);
        Page<Property> properties = propertyService.getPropertiesByUser(userId, pageable);
        Set<Long> rentedIds = propertyService.getRentedPropertyIds();
        
        List<Map<String, Object>> result = properties.getContent().stream()
                .map(property -> {
                    Map<String, Object> propertyMap = new HashMap<>();
                    propertyMap.put("property", property);
                    propertyMap.put("isRented", rentedIds.contains(property.getId()));
                    return propertyMap;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    // 4. DELETE PROPERTY
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProperty(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        // FIX: Use jwt.getSubject()
        propertyService.deleteProperty(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    // 5. SERVE IMAGES
    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path file = Paths.get("uploads").resolve(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping
    public ResponseEntity<Page<Property>> getAllProperties(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(propertyService.getAllProperties(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Property> getPropertyById(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        // Pass viewer ID for view tracking; null if somehow unauthenticated
        String viewerId = jwt != null ? jwt.getSubject() : null;
        return ResponseEntity.ok(propertyService.getPropertyById(id, viewerId));
    }

    @GetMapping("/feed")
    public ResponseEntity<List<Property>> getFeed(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(propertyService.getFeedForUser(jwt.getSubject()));
    }
}