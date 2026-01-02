package com.roomify.configurations.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Intercepts STOMP messages to authenticate users via JWT.
 * Extracts the JWT from the 'Authorization' header on CONNECT frames.
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    private final JwtDecoder jwtDecoder;

    public WebSocketAuthInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Extract Authorization header from STOMP headers
            List<String> authHeaders = accessor.getNativeHeader("Authorization");

            if (authHeaders != null && !authHeaders.isEmpty()) {
                String authHeader = authHeaders.get(0);

                if (authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);

                    try {
                        // Validate the JWT using the same decoder as REST endpoints
                        Jwt jwt = jwtDecoder.decode(token);

                        // Extract user ID (subject) from the token
                        String userId = jwt.getSubject();

                        log.debug("WebSocket CONNECT authenticated for user: {}", userId);

                        // Create authentication principal
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userId,
                                        null,
                                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                                );

                        // Store user info in session attributes for later use
                        accessor.setUser(authentication);
                        accessor.getSessionAttributes().put("userId", userId);

                    } catch (JwtException e) {
                        log.error("WebSocket JWT validation failed: {}", e.getMessage());
                        throw new IllegalArgumentException("Invalid JWT token");
                    }
                } else {
                    log.warn("WebSocket CONNECT missing Bearer prefix in Authorization header");
                    throw new IllegalArgumentException("Authorization header must start with 'Bearer '");
                }
            } else {
                log.warn("WebSocket CONNECT without Authorization header");
                // Allow connection without auth for initial handshake, but subscriptions will fail
                // Alternatively, uncomment below to require auth:
                // throw new IllegalArgumentException("Missing Authorization header");
            }
        }

        return message;
    }
}
