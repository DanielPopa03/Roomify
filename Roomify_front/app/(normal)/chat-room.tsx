import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Blue, Neutral, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PropertyContextBar, PropertyDetailModal } from '@/components/ui';

export default function TenantChatRoomScreen() {
    const { chatId, title, subTitle } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const { getAccessToken, dbUser } = useAuth();

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [propertyContext, setPropertyContext] = useState<any>(null);
    const [contextLoading, setContextLoading] = useState(true);
    const [showPropertyModal, setShowPropertyModal] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const currentUserId = dbUser?.id || '';

    // Get access token on mount
    useEffect(() => {
        const fetchToken = async () => {
            const token = await getAccessToken();
            setAccessToken(token || null);
        };
        fetchToken();
    }, [getAccessToken]);

    // --- WebSocket for real-time messages ---
    const handleWebSocketMessage = useCallback((message: any) => {
        // Add the incoming message (it's from the other person)
        const newMessage = {
            id: message.id,
            text: message.text,
            sender: 'them', // It's from the other person
            isRead: message.isRead,
            timestamp: message.timestamp,
        };

        setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === message.id)) {
                return prev;
            }
            return [...prev, newMessage];
        });

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, []);

    const { isConnected, error: wsError } = useWebSocket({
        matchId: chatId as string,
        accessToken,
        currentUserId,
        onMessage: handleWebSocketMessage,
        enabled: !!accessToken && !!chatId,
    });

    // --- Fetch Property Context ---
    const fetchPropertyContext = useCallback(async () => {
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/chats/${chatId}/context`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setPropertyContext(data);
            }
        } catch (error) {
            console.error("Failed to fetch property context", error);
        } finally {
            setContextLoading(false);
        }
    }, [chatId, getAccessToken, MY_IP]);

    // --- 1. Mark Messages as Read ---
    const markAsRead = useCallback(async () => {
        try {
            const token = await getAccessToken();
            await fetch(`http://${MY_IP}:8080/api/chats/${chatId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Failed to mark messages as read", error);
        }
    }, [chatId, getAccessToken, MY_IP]);

    // --- 2. Fetch Messages ---
    const fetchMessages = useCallback(async (showLoading = false) => {
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/chats/${chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [chatId, getAccessToken, MY_IP]);

    // --- 3. Lifecycle & Polling (fallback) ---
    useEffect(() => {
        fetchPropertyContext(); // Fetch property context first
        fetchMessages(true);
        markAsRead();

        // Polling as fallback (every 10 seconds if WebSocket not connected)
        const interval = setInterval(() => {
            if (!isConnected) {
                fetchMessages(false);
            }
            markAsRead();
        }, isConnected ? 10000 : 3000); // Slower polling if WebSocket connected

        return () => clearInterval(interval);
    }, [fetchMessages, markAsRead, isConnected, fetchPropertyContext]);

    // --- 4. Send Message Logic ---
    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const textToSend = inputText.trim();
        setInputText('');
        setSending(true);

        const tempId = Date.now().toString();
        const optimisticMessage = {
            id: tempId,
            text: textToSend,
            sender: 'me',
            isRead: false,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: textToSend })
            });

            if (response.ok) {
                const savedMessage = await response.json();
                // Replace optimistic message with real one
                setMessages(prev => prev.map(m => 
                    m.id === tempId ? { ...savedMessage, sender: 'me' } : m
                ));
            }
        } catch (error) {
            console.error("Send failed", error);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setSending(false);
        }
    };

    // --- 5. Handle Enter vs Shift+Enter ---
    const handleKeyPress = (e: any) => {
        if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.sender === 'me';
        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                    {item.text}
                </Text>

                {/* Footer: Time + Read Ticks */}
                <View style={styles.messageFooter}>
                    <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                        {item.timestamp}
                    </Text>

                    {/* Only show ticks for MY messages */}
                    {isMe && (
                        <View style={styles.readReceiptContainer}>
                            {item.isRead ? (
                                // READ: Double Green Ticks
                                <Ionicons name="checkmark-done" size={16} color="#4ADE80" />
                            ) : (
                                // SENT: Single Grey Tick
                                <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.6)" />
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Blue[600]} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{title || 'Chat'}</Text>
                    {subTitle && <Text style={styles.headerSubTitle}>{subTitle}</Text>}
                    {/* WebSocket status indicator */}
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4ADE80' : '#F59E0B' }]} />
                        <Text style={styles.statusText}>
                            {isConnected ? 'Live' : 'Polling'}
                        </Text>
                    </View>
                </View>
                <View style={{ width: 32 }} />
            </View>

            {/* Property Context Bar */}
            <PropertyContextBar
                property={propertyContext?.property}
                onPress={() => {
                    if (propertyContext?.property?.id) {
                        console.log('Opening property modal for:', propertyContext.property.id);
                        setShowPropertyModal(true);
                    }
                }}
                loading={contextLoading}
            />

            {/* Property Detail Modal */}
            <PropertyDetailModal
                visible={showPropertyModal}
                onClose={() => setShowPropertyModal(false)}
                propertyId={propertyContext?.property?.id || null}
            />

            {isLoading ? (
                <View style={styles.centered}><ActivityIndicator color={Blue[600]} /></View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <View style={[styles.inputContainer, { paddingBottom: Math.max(Spacing.md, insets.bottom) }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        onKeyPress={handleKeyPress}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() && !sending) && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim() || sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    backButton: { padding: Spacing.sm },
    headerInfo: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Neutral[900] },
    headerSubTitle: { fontSize: Typography.size.xs, color: Blue[600] },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    statusText: { fontSize: 10, color: Neutral[400] },
    listContent: { padding: Spacing.md, paddingBottom: Spacing.xl },

    messageBubble: { maxWidth: '80%', padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
    myMessage: { alignSelf: 'flex-end', backgroundColor: Blue[600], borderBottomRightRadius: 2 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: Neutral[100], borderBottomLeftRadius: 2 },

    messageText: { fontSize: Typography.size.base, marginBottom: 4 },
    myMessageText: { color: '#FFFFFF' },
    theirMessageText: { color: Neutral[900] },

    messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 10 },
    myTimeText: { color: Blue[100] },
    theirTimeText: { color: Neutral[400] },
    readReceiptContainer: { marginLeft: 2 },

    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Neutral[100], backgroundColor: '#FFFFFF' },
    input: { flex: 1, backgroundColor: Neutral[50], borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, maxHeight: 100 },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Blue[600], justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm },
    sendButtonDisabled: { backgroundColor: Neutral[300] },
});