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
    // Nullable Boolean allows for "Not Specified" which won't trigger negative scores

    @Column(name = "is_smoker")
    private Boolean isSmoker;

    @Column(name = "has_pets")
    private Boolean hasPets;

    @Column(name = "min_rooms")
    private Integer minRooms;

    @Column(name = "wants_extra_bathroom")
    private Boolean wantsExtraBathroom;

    // The user selects ONE type that describes them (e.g., STUDENT)
    @Enumerated(EnumType.STRING)
    @Column(name = "tenant_type")
    private PreferredTenantType tenantType;

    public boolean getProfileComplete() {
        return this.role != null
                && this.phoneNumber != null && !this.phoneNumber.isBlank()
                && this.firstName != null && !this.firstName.isBlank();
    }
}