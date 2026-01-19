package com.roomify.controller;

import com.roomify.model.User;
import com.roomify.service.UserService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;
    private final Path rootLocation = Paths.get("uploads");

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/authorize")
    public ResponseEntity<User> authorize() {
        return ResponseEntity.ok(userService.getOrSyncUser());
    }

    @GetMapping("/{id:.+}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id:.+}")
    public ResponseEntity<User> updateUser(
            @PathVariable String id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt
    ) {
        if (!jwt.getSubject().equals(id)) {
            return ResponseEntity.status(403).build();
        }
        User updatedUser = userService.updateOrCreateUser(id, payload);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{id:.+}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        if (!jwt.getSubject().equals(id)) {
            return ResponseEntity.status(403).build();
        }
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmail(
            @RequestParam String email,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        boolean taken = userService.isEmailTaken(email, currentUserId);
        return ResponseEntity.ok(Map.of("isTaken", taken));
    }

    // --- MISSING ENDPOINT: LANDLORD FEED ---
    @GetMapping("/feed")
    public ResponseEntity<List<User>> getTenantFeed(
            @RequestParam(required = false) Long propertyId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String landlordId = jwt.getSubject();
        List<User> feed = userService.getTenantFeed(landlordId, propertyId);
        return ResponseEntity.ok(feed);
    }
    // ---------------------------------------

    // --- IMAGE SERVING ---
    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path file = rootLocation.resolve(filename);
            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_JPEG)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}