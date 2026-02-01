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

import java.time.LocalDateTime;
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
    private static final java.time.Duration MATCH_EXPIRY_WINDOW = java.time.Duration.ofHours(24);

    private List<Match> pruneExpiredMatches(List<Match> matches) {
        List<Match> valid = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Match m : matches) {
            // Only check confirmed matches
            if (m.getStatus() != MatchStatus.MATCHED) {
                valid.add(m); // Keep non-matched (safety)
                continue;
            }

            boolean tenantMessaged = Boolean.TRUE.equals(m.getTenantMessaged());
            LocalDateTime created = m.getCreatedAt();

            if (!tenantMessaged && created != null && created.plus(MATCH_EXPIRY_WINDOW).isBefore(now)) {
                // Expired: punish tenant and delete match
                User tenant = m.getTenant();
                tenant.setSeriousnessScore((tenant.getSeriousnessScore() == null ? 0 : tenant.getSeriousnessScore()) - 1);
                userRepository.save(tenant);
                // Remove any chat messages first to avoid FK violations
                chatMessageRepository.deleteByMatchId(m.getId());
                matchRepository.delete(m);
            } else {
                valid.add(m);
            }
        }
        return valid;
    }

    public List<Map<String, Object>> getLandlordConversations(String landlordId) {
        List<Match> matches = matchRepository.findByLandlord_IdAndStatusOrderByUpdatedAtDesc(landlordId, MatchStatus.MATCHED);

        // Prune expired matches first
        matches = pruneExpiredMatches(matches);

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

            // Countdown & flags
            dto.put("tenantMessaged", match.getTenantMessaged());
            if (!Boolean.TRUE.equals(match.getTenantMessaged()) && match.getCreatedAt() != null) {
                LocalDateTime expires = match.getCreatedAt().plus(MATCH_EXPIRY_WINDOW);
                long secondsLeft = java.time.Duration.between(LocalDateTime.now(), expires).getSeconds();
                dto.put("timeLeftSeconds", secondsLeft > 0 ? secondsLeft : 0);
                dto.put("expiresAt", expires.toString());
            } else {
                dto.put("timeLeftSeconds", 0);
                dto.put("expiresAt", null);
            }

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

        // If sender is the tenant and they message within the 24h window
        try {
            if (match.getTenant().getId().equals(senderId)) {
                boolean already = Boolean.TRUE.equals(match.getTenantMessaged());
                if (!already) {
                    LocalDateTime now = LocalDateTime.now();
                    LocalDateTime created = match.getCreatedAt();
                    if (created != null && (created.plus(MATCH_EXPIRY_WINDOW).isAfter(now) || created.plus(MATCH_EXPIRY_WINDOW).isEqual(now))) {
                        match.setTenantMessaged(true);
                        match.setTenantMessagedAt(now);

                        User tenant = match.getTenant();
                        tenant.setSeriousnessScore((tenant.getSeriousnessScore() == null ? 0 : tenant.getSeriousnessScore()) + 1);
                        userRepository.save(tenant);
                        matchRepository.save(match);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Warning: failed to update tenant messaged flag - " + e.getMessage());
        }

        // Update Match timestamp so it moves to top of list
        match.setUpdatedAt(LocalDateTime.now());
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

        // Prune expired matches first
        matches = pruneExpiredMatches(matches);

        return matches.stream().map(match -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", match.getId().toString());

            // Show Landlord Details to the Tenant
            User landlord = match.getLandlord();
            dto.put("landlordId", landlord.getId());
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

            // Countdown & flags
            dto.put("tenantMessaged", match.getTenantMessaged());
            if (!Boolean.TRUE.equals(match.getTenantMessaged()) && match.getCreatedAt() != null) {
                LocalDateTime expires = match.getCreatedAt().plus(MATCH_EXPIRY_WINDOW);
                long secondsLeft = java.time.Duration.between(LocalDateTime.now(), expires).getSeconds();
                dto.put("timeLeftSeconds", secondsLeft > 0 ? secondsLeft : 0);
                dto.put("expiresAt", expires.toString());
            } else {
                dto.put("timeLeftSeconds", 0);
                dto.put("expiresAt", null);
            }

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

    /**
     * Returns match metadata: tenantMessaged, timeLeftSeconds, expiresAt, participant ids
     */
    public Map<String, Object> getMatchInfo(Long matchId, String currentUserId) {
        Match match = matchRepository.findById(matchId).orElseThrow(() -> new RuntimeException("Match not found"));

        // Authorization: must be tenant or landlord
        if (!match.getTenant().getId().equals(currentUserId) && !match.getLandlord().getId().equals(currentUserId)) {
            throw new RuntimeException("Unauthorized to access match info");
        }

        Map<String, Object> dto = new HashMap<>();
        dto.put("id", match.getId().toString());
        dto.put("tenantId", match.getTenant().getId());
        dto.put("landlordId", match.getLandlord().getId());
        dto.put("tenantMessaged", match.getTenantMessaged());

        if (!Boolean.TRUE.equals(match.getTenantMessaged()) && match.getCreatedAt() != null) {
            LocalDateTime expires = match.getCreatedAt().plus(MATCH_EXPIRY_WINDOW);
            long secondsLeft = java.time.Duration.between(LocalDateTime.now(), expires).getSeconds();
            dto.put("timeLeftSeconds", secondsLeft > 0 ? secondsLeft : 0);
            dto.put("expiresAt", expires.toString());
        } else {
            dto.put("timeLeftSeconds", 0);
            dto.put("expiresAt", null);
        }

        return dto;
    }
}