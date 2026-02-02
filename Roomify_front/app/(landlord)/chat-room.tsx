import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
    Dimensions, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Blue, Neutral, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { InterviewApi, UsersApi, PublicUserProfile } from '@/services/api';
import { SafeImage } from '@/components/ui';
// 1. IMPORT REPORT MODAL
import ReportModal from '@/components/report-modal';

const formatSeconds = (sec: number) => {
    if (!sec || sec <= 0) return '0s';
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChatRoomScreen() {
    const { chatId, title, otherUserId } = useLocalSearchParams<{ chatId: string; title?: string; otherUserId?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const { getAccessToken } = useAuth();

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // New Feature State
    const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
    const [isVideoModalVisible, setVideoModalVisible] = useState(false);
    const [tenant, setTenant] = useState<PublicUserProfile | null>(null);
    const [sendingRequest, setSendingRequest] = useState(false);

    // --- 2. REPORT STATE ---
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportType, setReportType] = useState<'USER_PROFILE' | 'MESSAGE'>('USER_PROFILE');
    const [messageToReport, setMessageToReport] = useState<any>(null);

    // Match Metadata
    const [matchInfo, setMatchInfo] = useState<any | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [countdownActive, setCountdownActive] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    // --- 0. Fetch Tenant Details ---
    useEffect(() => {
        const fetchTenant = async () => {
            if (!otherUserId || otherUserId.trim() === '') return;
            try {
                const token = await getAccessToken();
                if (!token) return;
                const response = await UsersApi.getById(token, otherUserId);
                if (response.data) setTenant(response.data);
            } catch (error) {
                console.error('[ChatRoom] Failed to fetch tenant details:', error);
            }
        };
        fetchTenant();
    }, [otherUserId, getAccessToken]);

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

    useEffect(() => {
        fetchMessages(true);
        markAsRead();
        fetchMatchInfo();
        const interval = setInterval(() => {
            fetchMessages(false);
            markAsRead();
            fetchMatchInfo();
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchMessages, markAsRead, fetchMatchInfo]);

    // --- 4. Send Message Logic ---
    const sendMessage = async (text: string = inputText) => {
        if (!text.trim()) return;
        const textToSend = text.trim();
        if (text === inputText) setInputText('');
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
            await fetch(`http://${MY_IP}:8080/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSend })
            });
            fetchMessages();
            fetchMatchInfo();
        } catch (error) {
            console.error("Send failed", error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: any) => {
        if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleVideoAction = async (type: 'play' | 'unlock' | 'record') => {
        setIsActionSheetVisible(false);
        if (type === 'play') {
            setVideoModalVisible(true);
            return;
        }
        const message = type === 'unlock'
            ? "I'd like to watch your video intro, but it's locked. Can you share it? 🔒"
            : "Could you record a quick Video Intro so I can get to know you? 📹";

        setSendingRequest(true);
        await sendMessage(message);
        setSendingRequest(false);
    };

    // --- 5. REPORTING LOGIC ---

    // A. Long Press on Message
    const handleLongPress = (item: any) => {
        if (item.sender === 'me') return; // Can't report self
        setMessageToReport(item);
        setReportType('MESSAGE');
        setReportModalVisible(true);
    };

    // B. General Tenant Report (from Action Sheet)
    const handleReportTenant = () => {
        setIsActionSheetVisible(false);
        setMessageToReport(null);
        setReportType('USER_PROFILE');
        setReportModalVisible(true);
    };

    // C. Submit to Backend
    const submitReport = async (reason: string, description: string) => {
        if (!otherUserId) return;

        try {
            const token = await getAccessToken();
            const payload = {
                reportedUserId: otherUserId,
                reason,
                description,
                type: reportType,
                // Context
                chatId: chatId,
                messageId: reportType === 'MESSAGE' ? messageToReport?.id : null,
                contentSnapshot: reportType === 'MESSAGE' ? messageToReport?.text : `General report for tenant ${tenant?.firstName}`
            };

            const response = await fetch(`http://${MY_IP}:8080/api/reports`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert("Report Submitted", "Thank you. We will review this issue.");
            } else {
                Alert.alert("Error", "Failed to submit report.");
            }
        } catch (e) {
            Alert.alert("Error", "Network error.");
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.sender === 'me';
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                // Enable long press to report specific messages
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
            >
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
                                <Ionicons name={item.isRead ? "checkmark-done" : "checkmark"} size={16} color={item.isRead ? "#4ADE80" : "rgba(255,255,255,0.6)"} />
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
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
                    {matchInfo && !matchInfo.tenantMessaged && (matchInfo.timeLeftSeconds > 0 || secondsLeft > 0) && (
                        <Text style={styles.countdownText}>Tenant can message for: {formatSeconds(countdownActive ? secondsLeft : (matchInfo.timeLeftSeconds || 0))}</Text>
                    )}
                    {matchInfo && matchInfo.tenantMessaged && (
                        <Text style={styles.countdownText}>Tenant has messaged ✔️</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.headerAction}
                    onPress={() => {
                        if (otherUserId && otherUserId.trim() !== '') {
                            router.push(`/(landlord)/tenant-profile/${otherUserId}?matchId=${chatId}`);
                        }
                    }}
                >
                    <SafeImage
                        source={{
                            uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(tenant?.firstName || title || 'T')}&size=72&background=0284C7&color=fff`
                        }}
                        style={styles.headerAvatar}
                    />
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

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
                <View style={[styles.inputContainer, { paddingBottom: Math.max(Spacing.md, insets.bottom) }]}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setIsActionSheetVisible(true)}>
                        <Ionicons name="add" size={24} color={Blue[600]} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        onKeyPress={handleKeyPress}
                        blurOnSubmit={false}
                        inputAccessoryViewID="none"
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() && !sending) && styles.sendButtonDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!inputText.trim() || sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Action Sheet Modal */}
            <Modal visible={isActionSheetVisible} transparent animationType="slide" onRequestClose={() => setIsActionSheetVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsActionSheetVisible(false)}>
                    <View style={styles.actionSheet}>
                        <View style={styles.actionSheetHandle} />
                        <Text style={styles.actionSheetTitle}>Chat Actions</Text>

                        {/* Video Actions */}
                        <TouchableOpacity style={styles.actionItem} onPress={() => {
                            if (!tenant) { handleVideoAction('record'); return; }
                            const hasVideo = tenant.videoUrl && tenant.videoUrl.trim() !== '';
                            const isPublic = tenant.isVideoPublic === true;
                            if (hasVideo && isPublic) handleVideoAction('play');
                            else if (hasVideo && !isPublic) handleVideoAction('unlock');
                            else handleVideoAction('record');
                        }}>
                            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
                                <Ionicons name="videocam-outline" size={24} color="#9333EA" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionText}>{tenant?.videoUrl && tenant.isVideoPublic ? "Play Video Intro" : tenant?.videoUrl ? "Request Video Access" : "Request Video Recording"}</Text>
                                <Text style={styles.actionSubtext}>{tenant?.videoUrl && tenant.isVideoPublic ? "Watch tenant's intro" : tenant?.videoUrl ? "Video is private" : "Tenant hasn't recorded yet"}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* View Full Profile */}
                        <TouchableOpacity style={styles.actionItem} onPress={() => {
                            setIsActionSheetVisible(false);
                            if (otherUserId && otherUserId.trim() !== '') router.push(`/(landlord)/tenant-profile/${otherUserId}?matchId=${chatId}`);
                        }}>
                            <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                                <Ionicons name="person-outline" size={24} color="#0284C7" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionText}>View Full Profile</Text>
                                <Text style={styles.actionSubtext}>See job, bio, and lifestyle habits</Text>
                            </View>
                        </TouchableOpacity>

                        {/* --- NEW: REPORT BUTTON --- */}
                        <TouchableOpacity style={styles.actionItem} onPress={handleReportTenant}>
                            <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="flag-outline" size={24} color="#EF4444" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.actionText, { color: '#EF4444' }]}>Report Tenant</Text>
                                <Text style={styles.actionSubtext}>Flag inappropriate behavior</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={{ height: Spacing.xl + insets.bottom }} />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Video Player Modal */}
            <Modal visible={isVideoModalVisible} animationType="fade" transparent={false} onRequestClose={() => setVideoModalVisible(false)}>
                <View style={styles.videoModalContainer}>
                    <TouchableOpacity style={[styles.modalCloseButton, { top: insets.top + 10 }]} onPress={() => setVideoModalVisible(false)}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.videoPlayerWrapper}>
                        {tenant?.videoUrl && tenant.videoUrl.trim() !== '' ? (
                            Platform.OS === 'web' ? (
                                <video src={InterviewApi.getVideoUrl(tenant.videoUrl)} style={{ width: '100%', height: '100%', objectFit: 'contain' } as any} controls autoPlay />
                            ) : (
                                <Video source={{ uri: InterviewApi.getVideoUrl(tenant.videoUrl) }} style={{ width: '100%', height: 300 }} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay />
                            )
                        ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="videocam-off-outline" size={48} color="#666" /><Text style={{ color: '#999', marginTop: 12 }}>No video available</Text></View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* --- REPORT MODAL --- */}
            <ReportModal
                visible={reportModalVisible}
                onClose={() => setReportModalVisible(false)}
                onSubmit={submitReport}
                targetName={reportType === 'MESSAGE' ? 'Message' : (tenant?.firstName || 'Tenant')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    backButton: { padding: Spacing.sm },
    headerInfo: { flex: 1, alignItems: 'center' },
    countdownText: { fontSize: 12, color: Neutral[500], marginTop: 2 },
    headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Neutral[900] },
    headerAction: { padding: Spacing.xs },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Neutral[200] },
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
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Neutral[100], backgroundColor: '#FFFFFF' },
    actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Neutral[100], justifyContent: 'center', alignItems: 'center', marginRight: Spacing.xs, marginBottom: 4 },
    input: { flex: 1, backgroundColor: Neutral[50], borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 10, maxHeight: 100, fontSize: 16 },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Blue[600], justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm, marginBottom: 4 },
    sendButtonDisabled: { backgroundColor: Neutral[300] },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    actionSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, ...Shadows.lg },
    actionSheetHandle: { width: 40, height: 4, backgroundColor: Neutral[300], borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
    actionSheetTitle: { fontSize: Typography.size.lg, fontWeight: '700', color: Neutral[900], marginBottom: Spacing.lg, textAlign: 'center' },
    actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Neutral[50] },
    actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    actionText: { fontSize: Typography.size.base, fontWeight: '600', color: Neutral[900] },
    actionSubtext: { fontSize: Typography.size.xs, color: Neutral[500], marginTop: 2 },
    videoModalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
    modalCloseButton: { position: 'absolute', right: 20, zIndex: 10, padding: 10 },
    videoPlayerWrapper: { width: '100%', height: 300, backgroundColor: '#000' },
});