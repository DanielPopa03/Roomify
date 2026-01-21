package com.roomify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for the video interview analysis endpoint.
 * Contains AI-generated profile suggestions and video information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewAnalysisResponse {

    /**
     * AI-generated biography/description
     */
    private String bio;

    /**
     * AI-extracted or inferred job title
     */
    private String jobTitle;

    /**
     * Whether user indicated they're okay with smoking
     */
    private Boolean smokerFriendly;

    /**
     * Whether user indicated they have/like pets
     */
    private Boolean petFriendly;

    /**
     * URL to access the video on the server
     */
    private String videoUrl;

    /**
     * Filename of the video (for confirmation request)
     */
    private String videoFilename;

    /**
     * Gemini internal file URI (for debugging/reference)
     */
    private String geminiFileUri;

    /**
     * Creates response from UserProfileSuggestion and local video info
     */
    public static InterviewAnalysisResponse fromSuggestion(
            UserProfileSuggestion suggestion,
            String videoUrl,
            String videoFilename) {
        return InterviewAnalysisResponse.builder()
                .bio(suggestion.bio())
                .jobTitle(suggestion.jobTitle())
                .smokerFriendly(suggestion.smokerFriendly())
                .petFriendly(suggestion.petFriendly())
                .videoUrl(videoUrl)
                .videoFilename(videoFilename)
                .geminiFileUri(suggestion.videoUri())
                .build();
    }
}
