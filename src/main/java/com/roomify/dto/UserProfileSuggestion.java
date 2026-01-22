package com.roomify.dto;

/**
 * DTO representing profile suggestions extracted from a video interview by
 * Gemini AI.
 *
 * @param smokerFriendly Whether the user indicated they are smoker-friendly
 * @param petFriendly    Whether the user indicated they are pet-friendly
 * @param bio            A generated biography/description of the user
 * @param jobTitle       The user's stated or inferred job title
 * @param videoUri       The internal Gemini File URI for the uploaded video
 */
public record UserProfileSuggestion(
        Boolean smokerFriendly,
        Boolean petFriendly,
        String bio,
        String jobTitle,
        String videoUri) {
    /**
     * Creates a builder for UserProfileSuggestion with default values.
     */
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Boolean smokerFriendly = false;
        private Boolean petFriendly = false;
        private String bio = "";
        private String jobTitle = "";
        private String videoUri = "";

        public Builder smokerFriendly(Boolean smokerFriendly) {
            this.smokerFriendly = smokerFriendly;
            return this;
        }

        public Builder petFriendly(Boolean petFriendly) {
            this.petFriendly = petFriendly;
            return this;
        }

        public Builder bio(String bio) {
            this.bio = bio;
            return this;
        }

        public Builder jobTitle(String jobTitle) {
            this.jobTitle = jobTitle;
            return this;
        }

        public Builder videoUri(String videoUri) {
            this.videoUri = videoUri;
            return this;
        }

        public UserProfileSuggestion build() {
            return new UserProfileSuggestion(smokerFriendly, petFriendly, bio, jobTitle, videoUri);
        }
    }
}
