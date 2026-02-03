package com.roomify.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.roomify.model.enums.MatchStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "matches", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "tenant_id", "property_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tenant_id", nullable = false)
    @JsonIgnoreProperties({ "matches", "properties", "role", "bio", "phoneNumber" })
    private User tenant;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "landlord_id", nullable = false)
    @JsonIgnoreProperties({ "matches", "properties", "role", "bio", "phoneNumber" })
    private User landlord;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "property_id", nullable = false)
    @JsonIgnoreProperties({ "owner", "matches", "images", "description" })
    private Property property;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status;

    // --- NEW: MATCH SCORE ---
    // Default 0.
    // Swipe Right (Like) -> Increases (e.g., +10)
    // Swipe Left (Pass) -> Decreases (e.g., -50)
    @Column(columnDefinition = "double precision default 0")
    @Builder.Default
    private Double score = 0.0;

    // --- Rental Workflow: Viewing Date ---
    // Stores the confirmed viewing date/time
    private LocalDateTime viewingDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}