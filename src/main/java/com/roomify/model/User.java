package com.roomify.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "id", unique = true, nullable = false)
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    private String phoneNumber;

    private String firstName;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private LocalDate birthDate;

    private String gender;

    private Double latitude;
    private Double longitude;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @ManyToOne
    private Role role;

    // --- Video Interview Fields ---
    @Column(columnDefinition = "TEXT")
    private String videoUrl;

    @Column(columnDefinition = "TEXT")
    private String videoTranscript;

    @Column(name = "job_title")
    private String jobTitle;

    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Builder.Default
    @Column(name = "is_video_public")
    private Boolean isVideoPublic = false;

    @Builder.Default
    @Column(name = "smoker_friendly")
    private Boolean smokerFriendly = false;

    @Builder.Default
    @Column(name = "pet_friendly")
    private Boolean petFriendly = false;
    // --- End Video Interview Fields ---

    public boolean isProfileComplete() {
        return firstName != null && !firstName.isBlank() &&
                !firstName.equals("New User") && // Force them to change the default name
                phoneNumber != null && !phoneNumber.isBlank() &&
                email != null && !email.isBlank();
    }

    /**
     * Checks if the user has completed the video interview verification process.
     */
    public boolean isVideoVerified() {
        return Boolean.TRUE.equals(isVerified) && videoUrl != null && !videoUrl.isBlank();
    }
}