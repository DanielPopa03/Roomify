package com.roomify.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "properties")
@Data                // Generates Getters, Setters, toString, equals, and hashCode
@NoArgsConstructor   // REQUIRED by Hibernate/JPA to create the object
@AllArgsConstructor  // Generates a constructor with all fields
@Builder             // Allows you to use Property.builder().title("...").build()
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

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

    @Column(name = "number_of_rooms")
    private Integer numberOfRooms;

    @Column(name = "has_extra_bathroom")
    private Boolean hasExtraBathroom;

    @Enumerated(EnumType.STRING)
    @Column(name = "layout_type")
    private LayoutType layoutType;

    @Column(name = "is_smoker_friendly")
    private Boolean smokerFriendly;

    @Column(name = "is_pet_friendly")
    private Boolean petFriendly;

    @ElementCollection(targetClass = PreferredTenantType.class)
    @CollectionTable(
            name = "property_preferred_tenants",
            joinColumns = @JoinColumn(name = "property_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "tenant_type")
    @Builder.Default // Ensures the builder uses this default empty set instead of null
    private Set<PreferredTenantType> preferredTenants = new HashSet<>();
}