package com.roomify.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomify.model.ChatMessage;
import com.roomify.model.LeaseAgreement;
import com.roomify.model.Match;
import com.roomify.model.User;
import com.roomify.model.enums.Currency;
import com.roomify.model.enums.LeaseStatus;
import com.roomify.model.enums.MatchStatus;
import com.roomify.model.enums.MessageType;
import com.roomify.repository.ChatMessageRepository;
import com.roomify.repository.LeaseAgreementRepository;
import com.roomify.repository.MatchRepository;
import com.roomify.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final MatchRepository matchRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final LeaseAgreementRepository leaseAgreementRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("h:mm a");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM d");
    private static final DateTimeFormatter VIEWING_FORMAT = DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a");

    public ChatService(
            MatchRepository matchRepository,
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            LeaseAgreementRepository leaseAgreementRepository) {
        this.matchRepository = matchRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.leaseAgreementRepository = leaseAgreementRepository;
    }

    // ============================================================
    // RENTAL WORKFLOW ACTIONS
    // ============================================================

    /**
     * Propose a viewing date. Both landlord and tenant can propose.
     * Transitions: MATCHED → VIEWING_REQUESTED
     */
    @Transactional
    public Map<String, Object> proposeViewing(Long matchId, String proposerId, LocalDateTime viewingDate) {
        Match match = getMatchOrThrow(matchId);
        User proposer = getUserOrThrow(proposerId);

        // Validate user is part of this match
        validateUserInMatch(match, proposerId);

        // Validate state: Can only propose from MATCHED or re-propose from
        // VIEWING_REQUESTED
        Set<MatchStatus> allowedStates = Set.of(MatchStatus.MATCHED, MatchStatus.VIEWING_REQUESTED);
        if (!allowedStates.contains(match.getStatus())) {
            throw new IllegalStateException(
                    "Cannot propose viewing. Current status: " + match.getStatus() +
                            ". Must be MATCHED or VIEWING_REQUESTED.");
        }

        // Update match status and store proposed date
        match.setStatus(MatchStatus.VIEWING_REQUESTED);
        match.setViewingDate(viewingDate);
        matchRepository.save(match);

        // Create ACTION_CARD message
        Map<String, Object> metadata = Map.of(
                "action", "VIEWING_PROPOSAL",
                "date", viewingDate.toString(),
                "formattedDate", viewingDate.format(VIEWING_FORMAT));

        ChatMessage message = ChatMessage.builder()
                .match(match)
                .sender(proposer)
                .type(MessageType.ACTION_CARD)
                .content("📅 Viewing Proposal")
                .metadata(toJson(metadata))
                .isRead(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        updateMatchTimestamp(match);

        return toMessageDto(saved, proposerId);
    }

    /**
     * Accept a proposed viewing. Only the OTHER party (not the proposer) can
     * accept.
     * Transitions: VIEWING_REQUESTED → VIEWING_SCHEDULED
     */
    @Transactional
    public Map<String, Object> acceptViewing(Long matchId, String accepterId) {
        Match match = getMatchOrThrow(matchId);

        // Validate user is part of this match
        validateUserInMatch(match, accepterId);

        // Validate state
        if (match.getStatus() != MatchStatus.VIEWING_REQUESTED) {
            throw new IllegalStateException(
                    "Cannot accept viewing. Current status: " + match.getStatus() +
                            ". Must be VIEWING_REQUESTED.");
        }

        // Validate viewing date exists
        if (match.getViewingDate() == null) {
            throw new IllegalStateException("No viewing date has been proposed.");
        }

        // Update match status
        match.setStatus(MatchStatus.VIEWING_SCHEDULED);
        matchRepository.save(match);

        // Create SYSTEM message (no sender)
        String formattedDate = match.getViewingDate().format(VIEWING_FORMAT);
        ChatMessage systemMessage = ChatMessage.builder()
                .match(match)
                .sender(null) // System message
                .type(MessageType.SYSTEM)
                .content("✅ Viewing Confirmed for " + formattedDate)
                .metadata(null)
                .isRead(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(systemMessage);
        updateMatchTimestamp(match);

        return toMessageDto(saved, accepterId);
    }

    /**
     * Send a rent proposal with specific terms. Only landlord can send.
     * Transitions: VIEWING_SCHEDULED → OFFER_PENDING
     */
    @Transactional
    public Map<String, Object> sendRentProposal(
            Long matchId,
            String landlordId,
            BigDecimal monthlyPrice,
            LocalDate startDate,
            Currency currency) {
        Match match = getMatchOrThrow(matchId);
        User landlord = getUserOrThrow(landlordId);

        // Validate: Only landlord can send rent proposal
        if (!match.getLandlord().getId().equals(landlordId)) {
            throw new IllegalStateException("Only the landlord can send a rent proposal.");
        }

        // Validate state: Must have completed viewing
        if (match.getStatus() != MatchStatus.VIEWING_SCHEDULED) {
            throw new IllegalStateException(
                    "Cannot send rent proposal. Current status: " + match.getStatus() +
                            ". Viewing must be scheduled first.");
        }

        // Check if there's already a pending lease
        if (leaseAgreementRepository.existsByMatchIdAndStatus(matchId, LeaseStatus.PENDING)) {
            throw new IllegalStateException("A rent proposal is already pending for this match.");
        }

        // Create LeaseAgreement record
        LeaseAgreement lease = LeaseAgreement.builder()
                .match(match)
                .monthlyPrice(monthlyPrice)
                .currency(currency)
                .startDate(startDate)
                .status(LeaseStatus.PENDING)
                .build();
        LeaseAgreement savedLease = leaseAgreementRepository.save(lease);

        // Update match status
        match.setStatus(MatchStatus.OFFER_PENDING);
        matchRepository.save(match);

        // Create ACTION_CARD message
        Map<String, Object> metadata = Map.of(
                "action", "RENT_PROPOSAL",
                "leaseId", savedLease.getId(),
                "price", monthlyPrice,
                "currency", currency.name(),
                "startDate", startDate.toString());

        ChatMessage message = ChatMessage.builder()
                .match(match)
                .sender(landlord)
                .type(MessageType.ACTION_CARD)
                .content("💰 Rent Proposal")
                .metadata(toJson(metadata))
                .isRead(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        updateMatchTimestamp(match);

        return toMessageDto(saved, landlordId);
    }

    // ============================================================
    // EXISTING CHAT METHODS (Updated for new fields)
    // ============================================================

    /**
     * Get list of conversations for the Landlord
     */
    public List<Map<String, Object>> getLandlordConversations(String landlordId) {
        // Include all active rental workflow states, not just MATCHED
        List<MatchStatus> activeStatuses = List.of(
                MatchStatus.MATCHED,
                MatchStatus.VIEWING_REQUESTED,
                MatchStatus.VIEWING_SCHEDULED,
                MatchStatus.OFFER_PENDING,
                MatchStatus.RENTED);
        List<Match> matches = matchRepository.findByLandlord_IdAndStatusInOrderByUpdatedAtDesc(landlordId,
                activeStatuses);

        return matches.stream().map(match -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", match.getId().toString());

            User tenant = match.getTenant();
            dto.put("tenantId", tenant.getId());
            dto.put("tenantName", tenant.getFirstName());
            dto.put("tenantAvatar", null);
            dto.put("propertyTitle", match.getProperty().getTitle());
            dto.put("status", match.getStatus().name());

            Optional<ChatMessage> lastMsg = chatMessageRepository.findFirstByMatchIdOrderByCreatedAtDesc(match.getId());

            if (lastMsg.isPresent()) {
                dto.put("lastMessage", lastMsg.get().getContent());
                dto.put("timestamp", lastMsg.get().getCreatedAt().format(TIME_FORMAT));
            } else {
                dto.put("lastMessage", "New Match! Say hello.");
                dto.put("timestamp", match.getUpdatedAt().format(DATE_FORMAT));
            }

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

        return messages.stream().map(msg -> toMessageDto(msg, currentUserId)).collect(Collectors.toList());
    }

    /**
     * Send a new text message
     */
    @Transactional
    public Map<String, Object> sendMessage(Long matchId, String senderId, String content) {
        Match match = getMatchOrThrow(matchId);
        User sender = getUserOrThrow(senderId);

        ChatMessage message = ChatMessage.builder()
                .match(match)
                .sender(sender)
                .type(MessageType.TEXT)
                .content(content)
                .metadata(null)
                .isRead(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        updateMatchTimestamp(match);

        return toMessageDto(saved, senderId);
    }

    /**
     * Send a system message (no sender)
     */
    @Transactional
    public void sendSystemMessage(Long matchId, String content) {
        Match match = getMatchOrThrow(matchId);

        ChatMessage message = ChatMessage.builder()
                .match(match)
                .sender(null)
                .type(MessageType.SYSTEM)
                .content(content)
                .metadata(null)
                .isRead(false)
                .build();

        chatMessageRepository.save(message);
        updateMatchTimestamp(match);
    }

    /**
     * Get list of conversations for the Tenant
     */
    public List<Map<String, Object>> getTenantConversations(String tenantId) {
        List<MatchStatus> activeStatuses = List.of(
                MatchStatus.MATCHED,
                MatchStatus.VIEWING_REQUESTED,
                MatchStatus.VIEWING_SCHEDULED,
                MatchStatus.OFFER_PENDING,
                MatchStatus.RENTED);
        List<Match> matches = matchRepository.findByTenant_IdAndStatusInOrderByUpdatedAtDesc(tenantId, activeStatuses);

        return matches.stream().map(match -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", match.getId().toString());

            User landlord = match.getLandlord();
            dto.put("landlordName", landlord.getFirstName());
            dto.put("landlordAvatar", null);

            dto.put("propertyTitle", match.getProperty().getTitle());
            dto.put("propertyImage",
                    match.getProperty().getImages().isEmpty() ? null : match.getProperty().getImages().get(0).getUrl());
            dto.put("price", match.getProperty().getPrice());
            dto.put("status", match.getStatus().name());

            Optional<ChatMessage> lastMsg = chatMessageRepository.findFirstByMatchIdOrderByCreatedAtDesc(match.getId());
            if (lastMsg.isPresent()) {
                dto.put("lastMessage", lastMsg.get().getContent());
                dto.put("timestamp", lastMsg.get().getCreatedAt().format(TIME_FORMAT));
            } else {
                dto.put("lastMessage", "Match found! Start chatting.");
                dto.put("timestamp", match.getUpdatedAt().format(DATE_FORMAT));
            }

            long unread = chatMessageRepository.countByMatchIdAndSenderIdNotAndIsReadFalse(match.getId(), tenantId);
            dto.put("unreadCount", unread);

            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public void markMessagesAsRead(Long matchId, String currentUserId) {
        List<ChatMessage> unreadMessages = chatMessageRepository
                .findByMatchIdAndSenderIdNotAndIsReadFalse(matchId, currentUserId);

        if (!unreadMessages.isEmpty()) {
            unreadMessages.forEach(msg -> msg.setRead(true));
            chatMessageRepository.saveAll(unreadMessages);
        }
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    private Match getMatchOrThrow(Long matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found: " + matchId));
    }

    private User getUserOrThrow(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
    }

    private void validateUserInMatch(Match match, String userId) {
        boolean isTenant = match.getTenant().getId().equals(userId);
        boolean isLandlord = match.getLandlord().getId().equals(userId);
        if (!isTenant && !isLandlord) {
            throw new IllegalStateException("User is not part of this match.");
        }
    }

    private void updateMatchTimestamp(Match match) {
        match.setUpdatedAt(LocalDateTime.now());
        matchRepository.save(match);
    }

    private String toJson(Map<String, Object> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize metadata to JSON", e);
        }
    }

    private Map<String, Object> toMessageDto(ChatMessage msg, String currentUserId) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", msg.getId().toString());
        dto.put("text", msg.getContent());
        // Handle null type for old messages (default to TEXT)
        dto.put("type", msg.getType() != null ? msg.getType().name() : "TEXT");
        dto.put("isRead", msg.isRead());
        dto.put("timestamp", msg.getCreatedAt().format(TIME_FORMAT));

        // Enrich metadata with lease status for RENT_PROPOSAL
        String metadataStr = msg.getMetadata();
        if (metadataStr != null && msg.getType() == MessageType.ACTION_CARD) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> metadata = objectMapper.readValue(metadataStr, Map.class);
                
                // If it's a RENT_PROPOSAL, add the current lease status
                if ("RENT_PROPOSAL".equals(metadata.get("action")) && metadata.get("leaseId") != null) {
                    Long leaseId = Long.valueOf(metadata.get("leaseId").toString());
                    leaseAgreementRepository.findById(leaseId).ifPresent(lease -> {
                        metadata.put("leaseStatus", lease.getStatus().name());
                    });
                    dto.put("metadata", toJson(metadata));
                } else {
                    dto.put("metadata", metadataStr);
                }
            } catch (Exception e) {
                dto.put("metadata", metadataStr);
            }
        } else {
            dto.put("metadata", metadataStr);
        }

        // Determine sender (null for SYSTEM messages)
        if (msg.getSender() == null) {
            dto.put("sender", "system");
        } else {
            boolean isMe = msg.getSender().getId().equals(currentUserId);
            dto.put("sender", isMe ? "me" : "other");
        }

        return dto;
    }
}