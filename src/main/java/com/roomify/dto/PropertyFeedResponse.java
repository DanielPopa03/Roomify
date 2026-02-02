package com.roomify.dto;

import com.roomify.model.enums.LayoutType;
import com.roomify.model.enums.PreferredTenantType;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Data
public class PropertyFeedResponse {
    private Long id;
    private String title;
    private BigDecimal price;
    private Double surface;
    private String address;
    private String description;
    private Integer numberOfRooms;
    private Boolean hasExtraBathroom;
    private LayoutType layoutType;
    private Set<PreferredTenantType> preferredTenants;
    private Boolean smokerFriendly;
    private Boolean petFriendly;
    private Double latitude;
    private Double longitude;

    // Images mapping
    private List<ImageDto> images;

    // --- LANDLORD PROFILE INFO ---
    // This is the critical part for your navigation button
    private String ownerId;
    private String ownerFirstName;
    private String ownerPicture;

    @Data
    public static class ImageDto {
        private Long id;
        private String url;
        private Integer orderIndex;
    }
}