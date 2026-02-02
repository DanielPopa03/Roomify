package com.roomify.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // The person submitting the report
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    // The person being accused
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportType type;

    @Column(nullable = false)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String description;

    // --- Context Fields (Nullable based on type) ---

    @Column(name = "chat_id")
    private String chatId;

    @Column(name = "message_id")
    private String messageId;

    @Column(name = "property_id")
    private String propertyId;

    // Snapshot of the content at the time of reporting
    @Column(columnDefinition = "TEXT")
    private String contentSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum ReportStatus {
        PENDING,
        RESOLVED,
        DISMISSED
    }

    public enum ReportType {
        MESSAGE,
        PROPERTY,
        USER_PROFILE
    }
}