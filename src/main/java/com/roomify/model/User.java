package com.roomify.model;

import com.roomify.model.enums.PreferredTenantType;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id; // Auth0 Subject ID

    private String email;
    private String firstName;
    private String lastName;
    private String picture;
    private String phoneNumber;

    @Column(length = 1000)
    private String bio;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_photos", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "photo_url")
    private List<String> photos;

    // --- LIFESTYLE & PREFERENCES ---
    @Column(name = "is_smoker")
    private Boolean isSmoker;

    @Column(name = "has_pets")
    private Boolean hasPets;

    @Column(name = "min_rooms")
    private Integer minRooms;

    @Column(name = "wants_extra_bathroom")
    private Boolean wantsExtraBathroom;

    @Enumerated(EnumType.STRING)
    @Column(name = "tenant_type")
    private PreferredTenantType tenantType;

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

    // --- REPORTING & MODERATION ---

    @Builder.Default
    @Column(name = "seriousness_score", columnDefinition = "integer default 0")
    private Integer seriousnessScore = 0; // Starts at 0; increases/decreases with interactions

    @Builder.Default
    @Column(name = "is_banned", nullable = false, columnDefinition = "boolean default false")
    private Boolean isBanned = false;

    // --- Helpers ---

    public boolean isProfileComplete() {
        return firstName != null && !firstName.isBlank() &&
                !firstName.equals("New User") &&
                phoneNumber != null && !phoneNumber.isBlank() &&
                email != null && !email.isBlank();
    }

    public boolean getProfileComplete() {
        return this.role != null
                && this.phoneNumber != null && !this.phoneNumber.isBlank()
                && this.firstName != null && !this.firstName.isBlank();
    }

    public boolean isVideoVerified() {
        return Boolean.TRUE.equals(isVerified) && videoUrl != null && !videoUrl.isBlank();
    }
}