package com.roomify.controller;

import com.roomify.model.User;
import com.roomify.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/authorize")
    public ResponseEntity<User> authorize() {
        return ResponseEntity.ok(userService.getOrSyncUser());
    }

    @GetMapping("/{id:.+}") // Added regex support for special chars like |
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

    // --- ADDED THIS METHOD TO FIX 405 ERROR ---
    @DeleteMapping("/{id:.+}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        // Log to verify the request reached the controller
        System.out.println("Backend: Deleting user " + id);

        // Security check
        if (!jwt.getSubject().equals(id)) {
            return ResponseEntity.status(403).build();
        }

        userService.deleteUser(id);
        return ResponseEntity.noContent().build(); // Success 204
    }

    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmail(
            @RequestParam String email,
            @AuthenticationPrincipal Jwt jwt) {

        String currentUserId = jwt.getSubject();
        boolean taken = userService.isEmailTaken(email, currentUserId);

        return ResponseEntity.ok(Map.of("isTaken", taken));
    }
}