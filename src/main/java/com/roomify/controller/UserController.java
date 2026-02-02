package com.roomify.controller;

import com.roomify.model.Preferences;
import com.roomify.model.User;
import com.roomify.service.PreferencesService;
import com.roomify.dto.InterviewAnalysisResponse;
import com.roomify.dto.InterviewConfirmationRequest;
import com.roomify.dto.UserProfileSuggestion;
import com.roomify.service.GeminiService;
import com.roomify.service.UserService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
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
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;
    private final PreferencesService preferencesService;
    private final GeminiService geminiService;
    private final Path videoStorageLocation = Paths.get("uploads/videos");
    private final Path rootLocation = Paths.get("uploads");

    public UserController(UserService userService, PreferencesService preferencesService, GeminiService geminiService) {
        this.userService = userService;
        this.preferencesService = preferencesService;
        this.geminiService = geminiService;
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
            @AuthenticationPrincipal Jwt jwt) {
        if (!jwt.getSubject().equals(id)) {
            return ResponseEntity.status(403).build();
        }
        User updatedUser = userService.updateOrCreateUser(id, payload);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{id:.+}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
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

    @PostMapping("/preferences")
    public ResponseEntity<Preferences> savePreferences(
            @RequestBody Preferences preferences,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Preferences savedPreferences = preferencesService.savePreferences(userId, preferences);
        return ResponseEntity.ok(savedPreferences);
    }

    @GetMapping("/preferences")
    public ResponseEntity<Preferences> getPreferences(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Optional<Preferences> preferences = preferencesService.getPreferences(userId);
        return preferences.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/preferences")
    public ResponseEntity<Void> deletePreferences(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        preferencesService.deletePreferences(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/interview/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> analyzeInterview(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Video file is required"));
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("video/")) return ResponseEntity.badRequest().body(Map.of("error", "File must be a video"));

            String localVideoUrl = geminiService.saveVideoLocally(file);
            String videoFilename = localVideoUrl.substring(localVideoUrl.lastIndexOf("/") + 1);
            UserProfileSuggestion suggestion = geminiService.uploadAndAnalyzeVideo(file);
            InterviewAnalysisResponse response = InterviewAnalysisResponse.fromSuggestion(suggestion, localVideoUrl, videoFilename);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to analyze video: " + e.getMessage()));
        }
    }

    @PostMapping("/interview/confirm")
    public ResponseEntity<?> confirmInterview(
            @RequestBody InterviewConfirmationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            String userId = jwt.getSubject();
            User user = userService.getUserById(userId).orElseThrow(() -> new RuntimeException("User not found"));

            if (request.getBio() != null) user.setBio(request.getBio());
            if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle());
            if (request.getSmokerFriendly() != null) user.setSmokerFriendly(request.getSmokerFriendly());
            if (request.getPetFriendly() != null) user.setPetFriendly(request.getPetFriendly());
            if (request.getVideoFilename() != null) user.setVideoUrl("/user/interview/video/" + request.getVideoFilename());
            if (request.getIsVideoPublic() != null) user.setIsVideoPublic(request.getIsVideoPublic());

            user.setIsVerified(true);
            User savedUser = userService.saveUser(user);
            return ResponseEntity.ok(savedUser);
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to confirm profile: " + e.getMessage()));
        }
    }

    @GetMapping("/interview/video/{filename:.+}")
    public ResponseEntity<Resource> serveVideo(@PathVariable String filename) {
        try {
            Path filePath = videoStorageLocation.resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) return ResponseEntity.notFound().build();

            String contentType = "video/mp4";
            if (filename.endsWith(".webm")) contentType = "video/webm";
            else if (filename.endsWith(".mov")) contentType = "video/quicktime";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/feed")
    public ResponseEntity<List<User>> getTenantFeed (
            @RequestParam(required = false) Long propertyId,
            @AuthenticationPrincipal Jwt jwt) {
        String landlordId = jwt.getSubject();
        List<User> feed = userService.getTenantFeed(landlordId, propertyId);
        return ResponseEntity.ok(feed);
    }

    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path file = rootLocation.resolve(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}