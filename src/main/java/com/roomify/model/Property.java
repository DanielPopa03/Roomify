package com.roomify.model;

import com.roomify.model.enums.LayoutType;
import com.roomify.model.enums.PreferredTenantType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "properties")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- CHANGED: Replaced String ownerId with User relationship ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false) // This creates the Foreign Key
    private User owner;
    // ---------------------------------------------------------------

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private Double surface;

    @Column(nullable = false)
    private String address;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, name = "number_of_rooms")
    private Integer numberOfRooms;

    @Column(nullable = false, name = "has_extra_bathroom")
    private Boolean hasExtraBathroom;

    @Enumerated(EnumType.STRING)
    @Column(name = "layout_type")
    private LayoutType layoutType;

    @Column(name = "is_smoker_friendly")
    private Boolean smokerFriendly;

    @Column(name = "is_pet_friendly")
    private Boolean petFriendly;

    @ElementCollection(targetClass = PreferredTenantType.class)
    @CollectionTable(name = "property_preferred_tenants", joinColumns = @JoinColumn(name = "property_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "tenant_type")
    @Builder.Default
    private Set<PreferredTenantType> preferredTenants = new HashSet<>();

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<PropertyImage> images = new ArrayList<>();

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @org.hibernate.annotations.Formula("(SELECT COUNT(*) FROM matches m WHERE m.property_id = id AND m.status = 'TENANT_LIKED')")
    private int interestedCount;

    // --- TRANSIENT FIELDS (not persisted, populated at runtime) ---

    /**
     * Number of users currently viewing this property (last 15 minutes).
     * Only populated when fetching single property details.
     */
    @Transient
    private Integer activeViewersCount;

    /**
     * True if property has received 5+ likes in the last 48 hours.
     * Populated on both feed and single property views.
     */
    @Transient
    private Boolean isTrending;
}