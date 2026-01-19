package com.roomify.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomify.dto.UserProfileSuggestion;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Service for interacting with Google Gemini AI API.
 * Handles video upload to Gemini File API and content analysis using Gemini 1.5
 * Flash.
 */
@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private static final String GEMINI_UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";
    private static final String GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    private static final String ANALYSIS_PROMPT = """
            Analyze this video of a person introducing themselves for a rental property application.
            Extract their personality traits and profile details from what they say and how they present themselves.

            Return ONLY a valid JSON object with the following structure (no markdown, no code blocks, just raw JSON):
            {
                "smokerFriendly": boolean (true if they mention smoking, being a smoker, or being okay with smoking),
                "petFriendly": boolean (true if they mention having pets, owning animals, or being an animal lover),
                "bio": "Write a 2-3 sentence bio in FIRST PERSON (e.g., 'Hi, I'm... I work as... I enjoy...')",
                "jobTitle": "Their job title or occupation if mentioned, otherwise 'Not specified'"
            }

            IMPORTANT:
            - Write the bio in FIRST PERSON as if the person is speaking about themselves
            - If they mention pets (cats, dogs, etc.) -> petFriendly = true
            - If they mention smoking or being a smoker -> smokerFriendly = true
            - If a trait is not mentioned, default to false
            """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Path videoStorageLocation = Paths.get("uploads/videos");

    public GeminiService() {
        this.restClient = RestClient.create();
        this.objectMapper = new ObjectMapper();
        initStorage();
    }

    private void initStorage() {
        try {
            Files.createDirectories(videoStorageLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize video storage directory", e);
        }
    }

    /**
     * Saves a video file locally and returns the relative path.
     *
     * @param file The uploaded video file
     * @return The relative URL path to access the video
     */
    public String saveVideoLocally(MultipartFile file) {
        try {
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isBlank()) {
                originalFilename = "interview.mp4";
            }

            // Sanitize filename and add UUID prefix
            String sanitizedName = originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
            String filename = UUID.randomUUID().toString() + "_" + sanitizedName;

            Path targetPath = videoStorageLocation.resolve(filename);
            Files.copy(file.getInputStream(), targetPath);

            // Return relative URL path (consistent with property images)
            return "/api/user/videos/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to save video file", e);
        }
    }

    /**
     * Uploads a video to Gemini File API.
     * Uses the resumable upload protocol with start, upload, finalize in single
     * request.
     *
     * @param file The video file to upload
     * @return The Gemini file URI (e.g., "files/xxxxx")
     */
    public String uploadVideoToGemini(MultipartFile file) {
        try {
            String mimeType = file.getContentType();
            if (mimeType == null) {
                mimeType = "video/mp4";
            }

            // Step 1: Initiate resumable upload
            String startResponse = restClient.post()
                    .uri(GEMINI_UPLOAD_URL + "?key=" + apiKey)
                    .header("X-Goog-Upload-Protocol", "resumable")
                    .header("X-Goog-Upload-Command", "start")
                    .header("X-Goog-Upload-Header-Content-Length", String.valueOf(file.getSize()))
                    .header("X-Goog-Upload-Header-Content-Type", mimeType)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"file\": {\"display_name\": \"interview_video\"}}")
                    .retrieve()
                    .toEntity(String.class)
                    .getHeaders()
                    .getFirst("X-Goog-Upload-URL");

            if (startResponse == null) {
                throw new RuntimeException("Failed to get upload URL from Gemini");
            }

            // Step 2: Upload the file data
            String uploadResponse = restClient.post()
                    .uri(startResponse)
                    .header("X-Goog-Upload-Command", "upload, finalize")
                    .header("X-Goog-Upload-Offset", "0")
                    .contentType(MediaType.parseMediaType(mimeType))
                    .body(file.getBytes())
                    .retrieve()
                    .body(String.class);

            // Parse the response to get the file URI
            JsonNode responseNode = objectMapper.readTree(uploadResponse);
            JsonNode fileNode = responseNode.get("file");
            if (fileNode != null && fileNode.has("uri")) {
                return fileNode.get("uri").asText();
            }

            throw new RuntimeException("No file URI in Gemini upload response: " + uploadResponse);

        } catch (RestClientException e) {
            throw new RuntimeException("Failed to upload video to Gemini: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read video file", e);
        }
    }

    /**
     * Analyzes a video using Gemini 2.0 Flash and extracts profile suggestions.
     *
     * @param geminiFileUri The Gemini file URI from uploadVideoToGemini
     * @return UserProfileSuggestion with extracted profile data
     */
    public UserProfileSuggestion analyzeVideo(String geminiFileUri) {
        try {
            // Wait for Gemini to finish processing the uploaded video
            waitForFileProcessing(geminiFileUri);

            // Construct the request payload for Gemini generateContent
            String requestBody = objectMapper.writeValueAsString(new GeminiRequest(geminiFileUri));

            String response = restClient.post()
                    .uri(GEMINI_GENERATE_URL + "?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            return parseGeminiResponse(response, geminiFileUri);

        } catch (RestClientException e) {
            throw new RuntimeException("Failed to analyze video with Gemini: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to construct Gemini request", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Video processing was interrupted", e);
        }
    }

    /**
     * Polls Gemini API to wait for a file to become ACTIVE.
     * Gemini needs time to process uploaded video files before analysis.
     *
     * @param fileUri The Gemini file URI (e.g., "https://.../files/abc-123")
     * @throws InterruptedException if the polling is interrupted
     * @throws RuntimeException     if timeout is reached or file processing fails
     */
    private void waitForFileProcessing(String fileUri) throws InterruptedException {
        // Extract file name from URI: "https://.../files/abc-123" -> "files/abc-123"
        String fileName;
        if (fileUri.contains("/files/")) {
            fileName = "files/" + fileUri.substring(fileUri.lastIndexOf("/files/") + 7);
        } else {
            throw new RuntimeException("Invalid Gemini file URI format: " + fileUri);
        }

        String fileStatusUrl = "https://generativelanguage.googleapis.com/v1beta/" + fileName + "?key=" + apiKey;

        int maxAttempts = 30;
        int delayMs = 2000;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                String response = restClient.get()
                        .uri(fileStatusUrl)
                        .retrieve()
                        .body(String.class);

                JsonNode responseNode = objectMapper.readTree(response);
                String state = responseNode.has("state") ? responseNode.get("state").asText() : "UNKNOWN";

                switch (state) {
                    case "ACTIVE":
                        System.out.println("Gemini file is ACTIVE. Proceeding to analysis...");
                        return; // File is ready!
                    case "FAILED":
                        String error = responseNode.has("error") ? responseNode.get("error").toString()
                                : "Unknown error";
                        throw new RuntimeException("Gemini file processing failed: " + error);
                    case "PROCESSING":
                        System.out.println(
                                "Gemini file still processing... (attempt " + attempt + "/" + maxAttempts + ")");
                        Thread.sleep(delayMs);
                        break;
                    default:
                        System.out.println(
                                "Gemini file state: " + state + " (attempt " + attempt + "/" + maxAttempts + ")");
                        Thread.sleep(delayMs);
                }
            } catch (RestClientException e) {
                System.err.println("Error checking file status: " + e.getMessage());
                Thread.sleep(delayMs);
            } catch (IOException e) {
                throw new RuntimeException("Failed to parse Gemini file status response", e);
            }
        }

        throw new RuntimeException("Video processing timed out after " + (maxAttempts * delayMs / 1000) + " seconds");
    }

    /**
     * Convenience method that uploads and analyzes in one call.
     *
     * @param file The video file to process
     * @return UserProfileSuggestion with extracted profile data
     */
    public UserProfileSuggestion uploadAndAnalyzeVideo(MultipartFile file) {
        String geminiFileUri = uploadVideoToGemini(file);
        return analyzeVideo(geminiFileUri);
    }

    private UserProfileSuggestion parseGeminiResponse(String response, String videoUri) {
        try {
            JsonNode root = objectMapper.readTree(response);

            // Navigate to the text content in Gemini's response structure
            JsonNode candidates = root.get("candidates");
            if (candidates == null || !candidates.isArray() || candidates.isEmpty()) {
                throw new RuntimeException("No candidates in Gemini response");
            }

            JsonNode content = candidates.get(0).get("content");
            if (content == null) {
                throw new RuntimeException("No content in Gemini response");
            }

            JsonNode parts = content.get("parts");
            if (parts == null || !parts.isArray() || parts.isEmpty()) {
                throw new RuntimeException("No parts in Gemini response");
            }

            String textContent = parts.get(0).get("text").asText();

            // Clean up the response (remove markdown code blocks if present)
            textContent = textContent.trim();
            if (textContent.startsWith("```json")) {
                textContent = textContent.substring(7);
            }
            if (textContent.startsWith("```")) {
                textContent = textContent.substring(3);
            }
            if (textContent.endsWith("```")) {
                textContent = textContent.substring(0, textContent.length() - 3);
            }
            textContent = textContent.trim();

            // Parse the JSON response from Gemini
            JsonNode profileData = objectMapper.readTree(textContent);

            return UserProfileSuggestion.builder()
                    .smokerFriendly(getBoolean(profileData, "smokerFriendly", false))
                    .petFriendly(getBoolean(profileData, "petFriendly", false))
                    .bio(getString(profileData, "bio", ""))
                    .jobTitle(getString(profileData, "jobTitle", "Not specified"))
                    .videoUri(videoUri)
                    .build();

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }

    private Boolean getBoolean(JsonNode node, String field, Boolean defaultValue) {
        return node.has(field) ? node.get(field).asBoolean() : defaultValue;
    }

    private String getString(JsonNode node, String field, String defaultValue) {
        return node.has(field) ? node.get(field).asText() : defaultValue;
    }

    /**
     * Inner class representing the Gemini generateContent request structure.
     */
    private record GeminiRequest(String fileUri) {

        // Custom serialization for Gemini API format
        @com.fasterxml.jackson.annotation.JsonValue
        public Object toGeminiFormat() {
            return java.util.Map.of(
                    "contents", java.util.List.of(
                            java.util.Map.of(
                                    "parts", java.util.List.of(
                                            java.util.Map.of(
                                                    "file_data", java.util.Map.of(
                                                            "mime_type", "video/mp4",
                                                            "file_uri", fileUri)),
                                            java.util.Map.of(
                                                    "text", ANALYSIS_PROMPT)))));
        }
    }
}
