package com.roomify.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "id", unique = true, nullable = false)
    private String id;

    @Column(unique = true, nullable = false)
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

    @ManyToOne
    private Role role;
}