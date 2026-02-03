package com.roomify.model;

import com.roomify.model.enums.Currency;
import com.roomify.model.enums.LeaseStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Represents the specific terms of a rental agreement between a landlord and
 * tenant.
 * Created when a landlord sends a rent proposal. The price may differ from the
 * property's listed price (e.g., negotiated discount).
 */
@Entity
@Table(name = "lease_agreements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaseAgreement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // One lease per match (a match can only have one active lease at a time)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false, unique = true)
    private Match match;

    // The agreed monthly rent (may differ from property.price)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Currency currency = Currency.EUR;

    // Lease start date
    @Column(nullable = false)
    private LocalDate startDate;

    // Lease end date (nullable for rolling/indefinite leases)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LeaseStatus status = LeaseStatus.PENDING;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
