package com.roomify.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    // --- LEGACY FIELD (Kept for backward compatibility) ---
    // The UserService automatically syncs the first photo from the list into this field.
    @Column(name = "picture")
    private String picture;

    // --- PHOTO GALLERY ---
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_photos", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "photo_url", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> photos = new ArrayList<>();

    public boolean isProfileComplete() {
        return firstName != null && !firstName.isBlank() &&
                !firstName.equals("New User") &&
                phoneNumber != null && !phoneNumber.isBlank() &&
                email != null && !email.isBlank();
    }
}