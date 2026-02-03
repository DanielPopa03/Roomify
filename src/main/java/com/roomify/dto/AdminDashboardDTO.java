package com.roomify.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminDashboardDTO {
    private long totalUsers;
    private long totalProperties;
    private long activeListings;
    private long pendingReports;
    private long newUsersToday;
    private long newPropertiesToday;
}