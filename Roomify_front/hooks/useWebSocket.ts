/**
 * WebSocket Hook for Real-time Chat
 * Uses STOMP over SockJS for real-time messaging
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketMessage {
    id: string;
    text: string;
    senderId: string;
    senderName?: string;
    isRead: boolean;
    timestamp: string;
}

interface UseWebSocketOptions {
    matchId: string;
    accessToken: string | null;
    currentUserId: string;
    onMessage: (message: WebSocketMessage) => void;
    enabled?: boolean;
}

export function useWebSocket({
    matchId,
    accessToken,
    currentUserId,
    onMessage,
    enabled = true
}: UseWebSocketOptions) {
    const clientRef = useRef<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || 'localhost';
    const WS_URL = `http://${MY_IP}:8080/ws`;

    const connect = useCallback(() => {
        if (!enabled || !accessToken || !matchId) {
            return;
        }

        // Disconnect existing client if any
        if (clientRef.current?.active) {
            clientRef.current.deactivate();
        }

        const client = new Client({
            // SockJS factory for browser compatibility
            webSocketFactory: () => new SockJS(WS_URL),
            
            // Pass JWT token in STOMP headers
            connectHeaders: {
                Authorization: `Bearer ${accessToken}`,
            },

            // Reconnect settings
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            debug: (str) => {
                if (__DEV__) {
                    console.log('[STOMP]', str);
                }
            },

            onConnect: () => {
                console.log('[WebSocket] Connected to', WS_URL);
                setIsConnected(true);
                setError(null);

                // Subscribe to chat topic for this match
                client.subscribe(`/topic/chat/${matchId}`, (message: IMessage) => {
                    try {
                        const data: WebSocketMessage = JSON.parse(message.body);
                        
                        // Skip messages from self (we already have optimistic update)
                        if (data.senderId === currentUserId) {
                            console.log('[WebSocket] Skipping own message');
                            return;
                        }

                        console.log('[WebSocket] Received message:', data);
                        onMessage(data);
                    } catch (e) {
                        console.error('[WebSocket] Failed to parse message:', e);
                    }
                });
            },

            onStompError: (frame) => {
                console.error('[WebSocket] STOMP error:', frame.headers['message']);
                setError(frame.headers['message'] || 'Connection error');
                setIsConnected(false);
            },

            onDisconnect: () => {
                console.log('[WebSocket] Disconnected');
                setIsConnected(false);
            },

            onWebSocketError: (event) => {
                console.error('[WebSocket] WebSocket error:', event);
                setError('WebSocket connection failed');
            },
        });

        clientRef.current = client;
        client.activate();

    }, [enabled, accessToken, matchId, currentUserId, onMessage, WS_URL]);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        connect();

        return () => {
            if (clientRef.current?.active) {
                console.log('[WebSocket] Cleaning up connection');
                clientRef.current.deactivate();
            }
        };
    }, [connect]);

    // Manual reconnect function
    const reconnect = useCallback(() => {
        setError(null);
        connect();
    }, [connect]);

    return {
        isConnected,
        error,
        reconnect,
    };
}

export default useWebSocket;
