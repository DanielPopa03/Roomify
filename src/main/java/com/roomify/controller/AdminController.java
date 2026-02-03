package com.roomify.controller;

import com.roomify.dto.AdminDashboardDTO;
import com.roomify.model.User;
import com.roomify.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardDTO> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    // 1. Update Role
    @PutMapping("/users/{id}/role")
    public ResponseEntity<Void> updateUserRole(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String newRole = payload.get("role");
        adminService.updateUserRole(id, newRole);
        return ResponseEntity.ok().build();
    }

    // 2. Toggle Ban
    @PutMapping("/users/{id}/ban")
    public ResponseEntity<Void> toggleBanUser(@PathVariable String id) {
        adminService.toggleUserBan(id);
        return ResponseEntity.ok().build();
    }

    // 3. Update Score
    @PutMapping("/users/{id}/score")
    public ResponseEntity<Void> updateUserScore(@PathVariable String id, @RequestBody Map<String, Integer> payload) {
        Integer newScore = payload.get("score");
        if (newScore != null) {
            adminService.updateUserScore(id, newScore);
        }
        return ResponseEntity.ok().build();
    }
}