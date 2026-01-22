package com.roomify.model;

import com.roomify.model.enums.LayoutType;
import com.roomify.model.enums.PreferredTenantType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "preferences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Preferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Price range
    @Column(name = "min_price")
    private BigDecimal minPrice;

    @Column(name = "max_price")
    private BigDecimal maxPrice;

    // Surface area
    @Column(name = "min_surface")
    private Double minSurface;

    @Column(name = "max_surface")
    private Double maxSurface;

    // Number of rooms
    @Column(name = "min_rooms")
    private Integer minRooms;

    @Column(name = "max_rooms")
    private Integer maxRooms;

    // Layout type preferences
    @ElementCollection(targetClass = LayoutType.class)
    @CollectionTable(
            name = "preference_layout_types",
            joinColumns = @JoinColumn(name = "preference_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "layout_type")
    @Builder.Default
    private Set<LayoutType> layoutTypes = new HashSet<>();

    // Smoker friendly
    @Column(name = "smoker_friendly")
    private Boolean smokerFriendly;

    // Pet friendly
    @Column(name = "pet_friendly")
    private Boolean petFriendly;

    // Preferred tenant types
    @ElementCollection(targetClass = PreferredTenantType.class)
    @CollectionTable(
            name = "preference_tenant_types",
            joinColumns = @JoinColumn(name = "preference_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "tenant_type")
    @Builder.Default
    private Set<PreferredTenantType> preferredTenants = new HashSet<>();

    // Location preferences
    @Column(name = "search_latitude")
    private Double searchLatitude;

    @Column(name = "search_longitude")
    private Double searchLongitude;

    @Column(name = "search_radius_km")
    private Double searchRadiusKm;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
