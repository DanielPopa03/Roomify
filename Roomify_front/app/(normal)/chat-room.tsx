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
import { UsersApi, PublicUserProfile } from '@/services/api';

export default function TenantChatRoomScreen() {
    const { chatId, title, subTitle, otherUserId } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const { getAccessToken, user } = useAuth();

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Landlord profile to show in header
    const [landlord, setLandlord] = useState<PublicUserProfile | null>(null);

    // Match metadata (countdown)
    const [matchInfo, setMatchInfo] = useState<any | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [countdownActive, setCountdownActive] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

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

    // --- Match Info (Countdown) ---
    const fetchMatchInfo = useCallback(async () => {
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/chats/${chatId}/info`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMatchInfo(data);
                setSecondsLeft(data?.timeLeftSeconds || 0);
                setCountdownActive((data?.timeLeftSeconds || 0) > 0 && !data?.tenantMessaged);
            }
        } catch (error) {
            console.warn('Failed to fetch match info', error);
        }
    }, [chatId, getAccessToken, MY_IP]);

    useEffect(() => {
        if (countdownActive && secondsLeft > 0) {
            const id = setInterval(() => {
                setSecondsLeft(s => {
                    if (s <= 1) {
                        setCountdownActive(false);
                        // Refresh conversations when countdown ends
                        fetchMessages();
                        fetchMatchInfo();
                        clearInterval(id);
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
            return () => clearInterval(id);
        }
    }, [countdownActive, secondsLeft, fetchMessages, fetchMatchInfo]);

    // --- 0b. Fetch Landlord Details (if provided) ---
    useEffect(() => {
        const fetchLandlord = async () => {
            if (!otherUserId || typeof otherUserId !== 'string') return;
            try {
                const token = await getAccessToken();
                const res = await UsersApi.getById(token!, otherUserId);
                if (res.data) setLandlord(res.data);
            } catch (e) {
                console.warn('Failed to fetch landlord profile', e);
            }
        };
        fetchLandlord();
    }, [otherUserId, getAccessToken]);

    // --- 3. Lifecycle & Polling ---
    useEffect(() => {
        fetchMessages(true);
        markAsRead();
        fetchMatchInfo();

        const interval = setInterval(() => {
            fetchMessages(false);
            markAsRead();
            // refresh match info less frequently (every 5s)
            fetchMatchInfo();
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchMessages, markAsRead, fetchMatchInfo]);

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
                // Refresh messages and match metadata (may flip tenantMessaged)
                fetchMessages();
                await fetchMatchInfo();
                // If tenant just messaged, stop the countdown
                if (matchInfo && !matchInfo.tenantMessaged) {
                    setMatchInfo(prev => ({ ...prev, tenantMessaged: true }));
                    setCountdownActive(false);
                    setSecondsLeft(0);
                }
            }
        } catch (error) {
            console.error("Send failed", error);
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

    const formatSeconds = (sec: number) => {
        if (!sec || sec <= 0) return '0s';
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        const seconds = sec % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
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

                    {/* Countdown */}
                    {matchInfo && !matchInfo.tenantMessaged && (matchInfo.timeLeftSeconds > 0 || secondsLeft > 0) && (
                        <Text style={styles.countdownText}>Time left to message: {formatSeconds(countdownActive ? secondsLeft : (matchInfo.timeLeftSeconds || 0))}</Text>
                    )}

                    {matchInfo && matchInfo.tenantMessaged && (
                        <Text style={styles.countdownText}>You already messaged. ✅</Text>
                    )}
                </View>

                <TouchableOpacity 
                    style={styles.headerAction}
                    onPress={() => {
                        if (otherUserId && otherUserId.trim() !== '') {
                            // Push using pathname + params so the route opens inside the (normal) Tabs
                            router.push({ pathname: `/(normal)/user-profile/[id]`, params: { id: otherUserId, matchId: chatId } });
                        }
                    }}
                >
                    <View style={styles.headerAvatarPlaceholder}>
                        <Text style={styles.headerAvatarInitial}>{landlord?.firstName?.[0] || title?.[0] || 'L'}</Text>
                    </View>
                </TouchableOpacity>
            </View>

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
    headerAction: { padding: Spacing.xs },
    headerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center' },
    headerAvatarInitial: { color: '#fff', fontWeight: '700' },
    countdownText: { fontSize: 12, color: Neutral[500], marginTop: 2 },
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