package com.roomify.dto;

import com.roomify.model.Report.ReportType;
import lombok.Data;

@Data
public class CreateReportRequest {
    private String reportedUserId;
    private String reason;
    private String description;

    // Enum: MESSAGE, PROPERTY, USER_PROFILE
    private ReportType type;

    // Context IDs (send whichever is relevant to the type)
    private String chatId;
    private String messageId;
    private String propertyId;

    // A snapshot of the text/content being reported (for Admin context)
    private String contentSnapshot;
}