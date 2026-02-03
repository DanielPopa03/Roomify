package com.roomify.model;

import com.roomify.model.enums.MessageType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
// vvv THIS IS THE PERFORMANCE OPTIMIZATION vvv
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_match_date", columnList = "match_id, createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    // Nullable for SYSTEM messages (no human sender)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    // Message type for conditional rendering in frontend
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MessageType type = MessageType.TEXT;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // JSON metadata for ACTION_CARD messages (e.g., {"action": "VIEWING_PROPOSAL",
    // "date": "..."})
    @Column(columnDefinition = "TEXT")
    private String metadata;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Builder.Default
    private boolean isRead = false;
}