package com.roomify.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class PropertyRequest {
    private String title;
    private BigDecimal price;
    private Double surface;
    private String address;
    private String description;
    private Integer numberOfRooms;
    private Boolean hasExtraBathroom;
    private String layoutType;
    private List<String> preferredTenants;
    private Boolean smokerFriendly;
    private Boolean petFriendly;

    private List<Long> deletedImageIds;
    private List<String> orderedIdentifiers;
}
