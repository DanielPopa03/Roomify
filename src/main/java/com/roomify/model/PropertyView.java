package com.roomify.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Tracks property page views for "High Demand" and analytics features.
 * Records are deduplicated (same viewer+property within 5 min = 1 view).
 * Old records (7+ days) are purged by a scheduled task.
 */
@Entity
@Table(name = "property_views", indexes = {
        @Index(name = "idx_property_views_property_id", columnList = "property_id"),
        @Index(name = "idx_property_views_viewed_at", columnList = "viewed_at"),
        @Index(name = "idx_property_views_dedup", columnList = "property_id, viewer_id, viewed_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    /**
     * Auth0 Subject ID of the viewer.
     * All viewers must be authenticated.
     */
    @Column(name = "viewer_id", nullable = false)
    private String viewerId;

    @CreationTimestamp
    @Column(name = "viewed_at", nullable = false, updatable = false)
    private LocalDateTime viewedAt;
}
