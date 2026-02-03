package com.roomify.controller;

import com.roomify.model.enums.Currency;
import com.roomify.service.ChatService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    // ============================================================
    // RENTAL WORKFLOW ENDPOINTS
    // ============================================================

    /**
     * Propose a viewing date. Both landlord and tenant can propose.
     * Request body: { "date": "2026-03-15T14:00:00" }
     */
    @PostMapping("/{matchId}/viewing/propose")
    public ResponseEntity<?> proposeViewing(
            @PathVariable Long matchId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal Jwt jwt) {
        System.out.println("[DEBUG] proposeViewing called with matchId: " + matchId);
        System.out.println("[DEBUG] Payload received: " + payload);
        String dateStr = payload.get("date");
        System.out.println("[DEBUG] Date string: " + dateStr);
        if (dateStr == null || dateStr.isBlank()) {
            System.out.println("[DEBUG] Date is null or blank!");
            return ResponseEntity.badRequest().body(Map.of("error", "Date is required"));
        }

        try {
            LocalDateTime viewingDate = LocalDateTime.parse(dateStr);
            System.out.println("[DEBUG] Parsed date: " + viewingDate);
            return ResponseEntity.ok(chatService.proposeViewing(matchId, jwt.getSubject(), viewingDate));
        } catch (IllegalStateException e) {
            System.out.println("[DEBUG] IllegalStateException: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.out.println("[DEBUG] Exception parsing date: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid date format. Use ISO-8601."));
        }
    }

    /**
     * Accept a proposed viewing. Transitions match to VIEWING_SCHEDULED.
     */
    @PostMapping("/{matchId}/viewing/accept")
    public ResponseEntity<?> acceptViewing(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            return ResponseEntity.ok(chatService.acceptViewing(matchId, jwt.getSubject()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Send a rent proposal. Only landlord can send.
     * Request body: { "price": 450.00, "startDate": "2026-04-01", "currency": "EUR"
     * }
     */
    @PostMapping("/{matchId}/rent/propose")
    public ResponseEntity<?> sendRentProposal(
            @PathVariable Long matchId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            Object priceObj = payload.get("price");
            String startDateStr = (String) payload.get("startDate");
            String currencyStr = (String) payload.get("currency");

            if (priceObj == null || startDateStr == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "price and startDate are required"));
            }

            BigDecimal price;
            if (priceObj instanceof Number) {
                price = BigDecimal.valueOf(((Number) priceObj).doubleValue());
            } else {
                price = new BigDecimal(priceObj.toString());
            }

            LocalDate startDate = LocalDate.parse(startDateStr);
            Currency currency = currencyStr != null ? Currency.valueOf(currencyStr.toUpperCase()) : Currency.EUR;

            return ResponseEntity
                    .ok(chatService.sendRentProposal(matchId, jwt.getSubject(), price, startDate, currency));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid currency or date format"));
        }
    }

    // ============================================================
    // EXISTING CHAT ENDPOINTS
    // ============================================================

    // 1. Get List of Chats for Landlord
    @GetMapping("/landlord")
    public ResponseEntity<List<Map<String, Object>>> getLandlordChats(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(chatService.getLandlordConversations(jwt.getSubject()));
    }

    // 2. Get Message History for a specific Chat Room
    @GetMapping("/{matchId}/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(chatService.getChatMessages(matchId, jwt.getSubject()));
    }

    @GetMapping("/{matchId}/info")
    public ResponseEntity<Map<String, Object>> getMatchInfo(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(chatService.getMatchInfo(matchId, jwt.getSubject()));
    }

    // 3. Send a Message
    @PostMapping("/{matchId}/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long matchId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String content = payload.get("text");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(chatService.sendMessage(matchId, jwt.getSubject(), content));
    }

    @GetMapping("/tenant")
    public ResponseEntity<List<Map<String, Object>>> getTenantChats(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(chatService.getTenantConversations(jwt.getSubject()));
    }

    @PutMapping("/{matchId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {
        chatService.markMessagesAsRead(matchId, jwt.getSubject());
        return ResponseEntity.ok().build();
    }
}