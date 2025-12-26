package com.roomify.controller;

import com.roomify.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    // 1. Get List of Chats for Landlord
    @GetMapping("/landlord")
    public ResponseEntity<List<Map<String, Object>>> getLandlordChats(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(chatService.getLandlordConversations(jwt.getSubject()));
    }

    // 2. Get Message History for a specific Chat Room
    @GetMapping("/{matchId}/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(chatService.getChatMessages(matchId, jwt.getSubject()));
    }

    // 3. Send a Message
    @PostMapping("/{matchId}/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long matchId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal Jwt jwt
    ) {
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
            @AuthenticationPrincipal Jwt jwt
    ) {
        chatService.markMessagesAsRead(matchId, jwt.getSubject());
        return ResponseEntity.ok().build();
    }
}