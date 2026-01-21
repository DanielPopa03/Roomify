package com.roomify.service;

import com.roomify.model.ChatMessage;
import com.roomify.model.Match;
import com.roomify.model.User;
import com.roomify.model.enums.MatchStatus;
import com.roomify.repository.ChatMessageRepository;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final MatchRepository matchRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatService(MatchRepository matchRepository, ChatMessageRepository chatMessageRepository, UserRepository userRepository) {
        this.matchRepository = matchRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    /**
     * Get list of conversations for the Landlord (Matches that are actively MATCHED)
     */
    public List<Map<String, Object>> getLandlordConversations(String landlordId) {
        List<Match> matches = matchRepository.findByLandlord_IdAndStatusOrderByUpdatedAtDesc(landlordId, MatchStatus.MATCHED);

        return matches.stream().map(match -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", match.getId().toString()); // The Chat ID is the Match ID

            // Tenant Details
            User tenant = match.getTenant();
            dto.put("tenantId", tenant.getId()); // Add tenantId for frontend navigation
            dto.put("tenantName", tenant.getFirstName());
            dto.put("tenantAvatar", null); // Add logic here if you have profile pictures
            dto.put("propertyTitle", match.getProperty().getTitle());

            // Fetch Last Message info
            Optional<ChatMessage> lastMsg = chatMessageRepository.findFirstByMatchIdOrderByCreatedAtDesc(match.getId());

            if (lastMsg.isPresent()) {
                dto.put("lastMessage", lastMsg.get().getContent());
                dto.put("timestamp", lastMsg.get().getCreatedAt().format(DateTimeFormatter.ofPattern("h:mm a")));
            } else {
                dto.put("lastMessage", "New Match! Say hello.");
                dto.put("timestamp", match.getUpdatedAt().format(DateTimeFormatter.ofPattern("MMM d")));
            }

            // Calculate unread count (messages NOT sent by me, and NOT read)
            long unread = chatMessageRepository.countByMatchIdAndSenderIdNotAndIsReadFalse(match.getId(), landlordId);
            dto.put("unreadCount", unread);

            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * Get Message History for a specific Chat Room
     */
    public List<Map<String, Object>> getChatMessages(Long matchId, String currentUserId) {
        List<ChatMessage> messages = chatMessageRepository.findByMatchIdOrderByCreatedAtAsc(matchId);

        return messages.stream().map(msg -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", msg.getId().toString());
            dto.put("text", msg.getContent());

            boolean isMe = msg.getSender().getId().equals(currentUserId);
            dto.put("sender", isMe ? "me" : "tenant");

            // --- VITAL: Pass the read status to the frontend ---
            dto.put("isRead", msg.isRead());
            // --------------------------------------------------

            dto.put("timestamp", msg.getCreatedAt().format(DateTimeFormatter.ofPattern("h:mm a")));
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * Send a new message
     */
    @Transactional
    public Map<String, Object> sendMessage(Long matchId, String senderId, String content) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ChatMessage message = ChatMessage.builder()
                .match(match)
                .sender(sender)
                .content(content)
                .isRead(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        // Update Match timestamp so it moves to top of list
        match.setUpdatedAt(java.time.LocalDateTime.now());
        matchRepository.save(match);

        // Return DTO consistent with getChatMessages
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", saved.getId().toString());
        dto.put("text", saved.getContent());
        dto.put("sender", "me");
        dto.put("timestamp", saved.getCreatedAt().format(DateTimeFormatter.ofPattern("h:mm a")));

        return dto;
    }

    public List<Map<String, Object>> getTenantConversations(String tenantId) {
        List<Match> matches = matchRepository.findByTenant_IdAndStatusOrderByUpdatedAtDesc(tenantId, MatchStatus.MATCHED);

        return matches.stream().map(match -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", match.getId().toString());

            // Show Landlord Details to the Tenant
            User landlord = match.getLandlord();
            dto.put("landlordName", landlord.getFirstName()); // or landlord.getName()
            dto.put("landlordAvatar", null); // Placeholder for avatar logic

            dto.put("propertyTitle", match.getProperty().getTitle());
            dto.put("propertyImage", match.getProperty().getImages().isEmpty() ? null : match.getProperty().getImages().get(0).getUrl());
            dto.put("price", match.getProperty().getPrice());

            // Message Preview
            Optional<ChatMessage> lastMsg = chatMessageRepository.findFirstByMatchIdOrderByCreatedAtDesc(match.getId());
            if (lastMsg.isPresent()) {
                dto.put("lastMessage", lastMsg.get().getContent());
                dto.put("timestamp", lastMsg.get().getCreatedAt().format(DateTimeFormatter.ofPattern("h:mm a")));
            } else {
                dto.put("lastMessage", "Match found! Start chatting.");
                dto.put("timestamp", match.getUpdatedAt().format(DateTimeFormatter.ofPattern("MMM d")));
            }

            // Unread Count
            long unread = chatMessageRepository.countByMatchIdAndSenderIdNotAndIsReadFalse(match.getId(), tenantId);
            dto.put("unreadCount", unread);

            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public void markMessagesAsRead(Long matchId, String currentUserId) {
        // Find messages sent by the OTHER person that are still unread
        List<ChatMessage> unreadMessages = chatMessageRepository
                .findByMatchIdAndSenderIdNotAndIsReadFalse(matchId, currentUserId);

        if (!unreadMessages.isEmpty()) {
            unreadMessages.forEach(msg -> msg.setRead(true));
            chatMessageRepository.saveAll(unreadMessages);
        }
    }
}