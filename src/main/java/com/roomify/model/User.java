package com.roomify.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "auth0_id", unique = true, nullable = false)
    private String auth0Id;

    @Column(nullable = false)
    private String email;

    private String firstName;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private LocalDate birthDate;

    private String gender;

    private Double latitude;
    private Double longitude;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
