package com.roomify.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyImage implements Comparable<PropertyImage> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String url;

    // --- NEW: Stores the position (0, 1, 2...) ---
    @Column(name = "image_order")
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    @JsonBackReference
    private Property property;

    // Helper to sort images easily in Java if needed
    @Override
    public int compareTo(PropertyImage other) {
        return Integer.compare(this.orderIndex, other.orderIndex);
    }
}
