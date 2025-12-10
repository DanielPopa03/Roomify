package com.roomify.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class PropertyRequest {
    // Basic Info
    private String title;
    private BigDecimal price;
    private Double surface;
    private String address;
    private String description;

    // Details
    private Integer numberOfRooms;
    private Boolean hasExtraBathroom;

    // Enums as Strings (to be safe)
    // Frontend sends "decomandat", "semidecomandat", etc.
    private String layoutType;

    // Frontend sends ["Student", "Family"]
    private List<String> preferredTenants;

    // Rules
    private Boolean smokerFriendly;
    private Boolean petFriendly;
}