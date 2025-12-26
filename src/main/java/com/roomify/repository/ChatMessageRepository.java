package com.roomify.repository;

import com.roomify.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByMatchIdOrderByCreatedAtAsc(Long matchId);

    Optional<ChatMessage> findFirstByMatchIdOrderByCreatedAtDesc(Long matchId);

    long countByMatchIdAndSenderIdNotAndIsReadFalse(Long matchId, String userId);

    // [NEW] Find unread messages where the sender is NOT the current user
    List<ChatMessage> findByMatchIdAndSenderIdNotAndIsReadFalse(Long matchId, String currentUserId);
}