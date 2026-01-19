package com.roomify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for confirming video interview profile data.
 * Used when the user reviews and approves the AI-generated suggestions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewConfirmationRequest {

    /**
     * User's biography/description (may be AI-generated or user-edited)
     */
    private String bio;

    /**
     * User's job title
     */
    private String jobTitle;

    /**
     * Whether user is okay with smoking/smokers
     */
    private Boolean smokerFriendly;

    /**
     * Whether user has pets or is okay with pets
     */
    private Boolean petFriendly;

    /**
     * Filename of the video stored on server
     */
    private String videoFilename;

    /**
     * Whether the video should be visible to landlords
     */
    private Boolean isVideoPublic;
}
