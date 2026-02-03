import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Blue, Neutral, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ChatApi } from '@/services/api';
import { SystemMessage, ActionCard } from '@/components/ui';
import type { ChatMessage as ChatMessageType } from '@/constants/types';

export default function TenantChatRoomScreen() {
    const { chatId, title, subTitle } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const { getAccessToken } = useAuth();

    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // NEW: UI State
    const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
    const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
    const [proposedDate, setProposedDate] = useState('');
    const [proposedTime, setProposedTime] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);

    // --- 1. Fetch Messages ---
    const fetchMessages = useCallback(async (showLoading = false) => {
        try {
            const token = await getAccessToken();
            const matchId = Array.isArray(chatId) ? chatId[0] : chatId;
            if (!token || !matchId) return;

            const response = await ChatApi.getMessages(token, matchId);
            if (response.data) {
                setMessages(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [chatId, getAccessToken]);

    // --- 2. Mark Messages as Read ---
    const markAsRead = useCallback(async () => {
        try {
            const token = await getAccessToken();
            const matchId = Array.isArray(chatId) ? chatId[0] : chatId;
            if (!token || !matchId) return;
            await ChatApi.markAsRead(token, matchId);
        } catch (error) {
            console.error("Failed to mark messages as read", error);
        }
    }, [chatId, getAccessToken]);

    // --- 3. Lifecycle & Polling ---
    useEffect(() => {
        fetchMessages(true);
        markAsRead();

        const interval = setInterval(() => {
            fetchMessages(false);
            markAsRead();
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchMessages, markAsRead]);

    // --- 4. Send Text Message ---
    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const textToSend = inputText.trim();
        setInputText('');
        setSending(true);

        const tempId = Date.now().toString();
        const optimisticMessage: ChatMessageType = {
            id: tempId,
            text: textToSend,
            type: 'TEXT',
            metadata: null,
            sender: 'me',
            isRead: false,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const token = await getAccessToken();
            const matchId = Array.isArray(chatId) ? chatId[0] : chatId;
            if (!token || !matchId) return;

            await ChatApi.sendMessage(token, matchId, textToSend);
            fetchMessages();
        } catch (error) {
            console.error("Send failed", error);
        } finally {
            setSending(false);
        }
    };

    // --- 5. Handle Enter Key ---
    const handleKeyPress = (e: any) => {
        if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // --- 6. NEW: Schedule Viewing (Tenant can also propose) ---
    const handleScheduleViewing = async () => {
        if (!proposedDate || !proposedTime) {
            Alert.alert('Missing Info', 'Please enter both date and time.');
            return;
        }

        const dateTime = `${proposedDate}T${proposedTime}:00`;
        
        setSendingRequest(true);
        try {
            const token = await getAccessToken();
            const matchId = Array.isArray(chatId) ? chatId[0] : chatId;
            if (!token || !matchId) return;
            
            const response = await ChatApi.proposeViewing(token, matchId, dateTime);
            if (response.error) {
                Alert.alert('Error', response.error);
            } else {
                setScheduleModalVisible(false);
                setProposedDate('');
                setProposedTime('');
                fetchMessages();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to propose viewing');
        } finally {
            setSendingRequest(false);
        }
    };

    // --- 7. NEW: Accept Viewing (from ActionCard) ---
    const handleAcceptViewing = async () => {
        try {
            const token = await getAccessToken();
            const matchId = Array.isArray(chatId) ? chatId[0] : chatId;
            if (!token || !matchId) return;
            
            const response = await ChatApi.acceptViewing(token, matchId);
            if (response.error) {
                Alert.alert('Error', response.error);
            } else {
                fetchMessages();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to accept viewing');
        }
    };

    // --- 8. NEW: Pay Rent (mocked for Phase 1) ---
    const handlePayRent = () => {
        Alert.alert(
            '💳 Payment Required',
            'This would open the payment flow in a future version.\n\nFor now, contact the landlord directly to finalize the lease.',
            [{ text: 'OK', style: 'default' }]
        );
    };

    // --- 9. Render Message with Type Switching ---
    const renderMessage = ({ item }: { item: ChatMessageType }) => {
        // SYSTEM messages: centered gray text
        if (item.type === 'SYSTEM') {
            return <SystemMessage text={item.text} timestamp={item.timestamp} />;
        }

        // ACTION_CARD messages: interactive cards
        if (item.type === 'ACTION_CARD' && item.metadata) {
            return (
                <ActionCard
                    metadata={item.metadata}
                    sender={item.sender}
                    timestamp={item.timestamp}
                    onAcceptViewing={item.sender !== 'me' ? handleAcceptViewing : undefined}
                    onPayRent={item.sender !== 'me' && item.metadata.action === 'RENT_PROPOSAL' ? handlePayRent : undefined}
                />
            );
        }

        // TEXT messages: standard bubbles
        const isMe = item.sender === 'me';
        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                    {item.text}
                </Text>

                <View style={styles.messageFooter}>
                    <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                        {item.timestamp}
                    </Text>

                    {isMe && (
                        <View style={styles.readReceiptContainer}>
                            {item.isRead ? (
                                <Ionicons name="checkmark-done" size={16} color="#4ADE80" />
                            ) : (
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
                </View>
                <View style={{ width: 32 }} />
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
                    {/* NEW: Plus Button for Actions */}
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => setIsActionSheetVisible(true)}
                    >
                        <Ionicons name="add" size={24} color={Blue[600]} />
                    </TouchableOpacity>

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

            {/* Action Sheet Modal */}
            <Modal
                visible={isActionSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsActionSheetVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setIsActionSheetVisible(false)}
                >
                    <View style={styles.actionSheet}>
                        <View style={styles.actionSheetHandle} />
                        <Text style={styles.actionSheetTitle}>Chat Actions</Text>
                        
                        {/* Schedule Viewing */}
                        <TouchableOpacity 
                            style={styles.actionItem}
                            onPress={() => {
                                setIsActionSheetVisible(false);
                                setScheduleModalVisible(true);
                            }}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionText}>📅 Request Viewing</Text>
                                <Text style={styles.actionSubtext}>Propose a time to see the property</Text>
                            </View>
                        </TouchableOpacity>
                        
                        <View style={{ height: Spacing.xl + insets.bottom }} />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Schedule Viewing Modal */}
            <Modal
                visible={isScheduleModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setScheduleModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.formModal}>
                        <Text style={styles.formModalTitle}>📅 Request Viewing</Text>
                        
                        <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="2026-03-15"
                            value={proposedDate}
                            onChangeText={setProposedDate}
                            keyboardType="numbers-and-punctuation"
                        />
                        
                        <Text style={styles.inputLabel}>Time (HH:MM)</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="14:00"
                            value={proposedTime}
                            onChangeText={setProposedTime}
                            keyboardType="numbers-and-punctuation"
                        />
                        
                        <View style={styles.formButtons}>
                            <TouchableOpacity 
                                style={styles.cancelButton}
                                onPress={() => setScheduleModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.submitButton, sendingRequest && { opacity: 0.5 }]}
                                onPress={handleScheduleViewing}
                                disabled={sendingRequest}
                            >
                                {sendingRequest ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Request</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Neutral[100], justifyContent: 'center', alignItems: 'center', marginRight: Spacing.xs },
    input: { flex: 1, backgroundColor: Neutral[50], borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, maxHeight: 100 },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Blue[600], justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm },
    sendButtonDisabled: { backgroundColor: Neutral[300] },

    // Action Sheet
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    actionSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, ...Shadows.lg },
    actionSheetHandle: { width: 40, height: 4, backgroundColor: Neutral[300], borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
    actionSheetTitle: { fontSize: Typography.size.lg, fontWeight: '700', color: Neutral[900], marginBottom: Spacing.lg, textAlign: 'center' },
    actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Neutral[50] },
    actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    actionText: { fontSize: Typography.size.base, fontWeight: '600', color: Neutral[900] },
    actionSubtext: { fontSize: Typography.size.xs, color: Neutral[500], marginTop: 2 },

    // Form Modals
    formModal: { backgroundColor: '#fff', marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.lg },
    formModalTitle: { fontSize: Typography.size.xl, fontWeight: '700', color: Neutral[900], marginBottom: Spacing.lg, textAlign: 'center' },
    inputLabel: { fontSize: Typography.size.sm, fontWeight: '600', color: Neutral[700], marginBottom: Spacing.xs },
    formInput: { backgroundColor: Neutral[50], borderRadius: BorderRadius.base, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 16, marginBottom: Spacing.md, borderWidth: 1, borderColor: Neutral[200] },
    formButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
    cancelButton: { flex: 1, padding: Spacing.md, marginRight: Spacing.sm, borderRadius: BorderRadius.base, backgroundColor: Neutral[100], alignItems: 'center' },
    cancelButtonText: { fontSize: Typography.size.base, fontWeight: '600', color: Neutral[700] },
    submitButton: { flex: 1, padding: Spacing.md, marginLeft: Spacing.sm, borderRadius: BorderRadius.base, backgroundColor: Blue[600], alignItems: 'center' },
    submitButtonText: { fontSize: Typography.size.base, fontWeight: '600', color: '#fff' },
});