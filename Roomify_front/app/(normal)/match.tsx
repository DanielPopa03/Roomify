import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    Image, 
    TouchableOpacity, 
    RefreshControl, 
    ActivityIndicator, 
    Animated,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Header, ConversationItem, EmptyState, Avatar, ChatBubble } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useConversations } from '@/hooks/useApi';

interface Message {
    id: string;
    text: string;
    timestamp: Date;
    senderId: string;
}

// Mock data for matches/conversations (fallback)
const MOCK_CONVERSATIONS = [
    { 
        id: '1', 
        landlordName: 'John Anderson',
        landlordAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        propertyTitle: 'Modern Downtown Apartment',
        propertyImage: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200',
        lastMessage: 'The apartment is available for viewing this Saturday at 2pm. Would that work for you?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
        unread: true,
        price: 1200,
    },
    { 
        id: '2', 
        landlordName: 'Sarah Mitchell',
        landlordAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        propertyTitle: 'Cozy Studio Near Park',
        propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200',
        lastMessage: 'Thanks for your interest! The deposit is one month\'s rent.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        unread: true,
        price: 950,
    },
    { 
        id: '3', 
        landlordName: 'Michael Brown',
        landlordAvatar: 'https://randomuser.me/api/portraits/men/52.jpg',
        propertyTitle: 'Spacious Family Home',
        propertyImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200',
        lastMessage: 'Yes, utilities are included in the rent.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        unread: false,
        price: 2500,
    },
    { 
        id: '4', 
        landlordName: 'Emily Davis',
        landlordAvatar: 'https://randomuser.me/api/portraits/women/68.jpg',
        propertyTitle: 'Penthouse with View',
        propertyImage: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=200',
        lastMessage: 'Let me know if you have any other questions!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        unread: false,
        price: 3500,
    },
];

export default function MatchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const chatListRef = useRef<FlatList>(null);
    
    // API hook
    const { data: apiConversations, isLoading, error, refetch } = useConversations();
    
    const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    
    // Update conversations when API data arrives
    useEffect(() => {
        if (apiConversations && apiConversations.length > 0) {
            setConversations(apiConversations.map(conv => ({
                id: conv.id,
                landlordName: conv.participants?.[0]?.firstName || 'Unknown',
                landlordAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
                propertyTitle: conv.property?.title || 'Property',
                propertyImage: conv.property?.images?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200',
                lastMessage: conv.lastMessage?.content || 'Start a conversation',
                timestamp: new Date(conv.lastMessage?.createdAt || conv.createdAt || Date.now()),
                unread: false,
                price: conv.property?.price || 1000,
            })));
        }
    }, [apiConversations]);
    
    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };
    
    const handleConversationPress = (conversationId: string) => {
        // Select conversation and load messages
        setSelectedConversation(conversationId);
        
        // Mock messages for demo
        const mockMessages: Message[] = [
            {
                id: '1',
                text: "Hi! I'm interested in this property. Is it still available?",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
                senderId: 'user',
            },
            {
                id: '2',
                text: "Hello! Yes, the apartment is still available. Would you like to schedule a viewing?",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23),
                senderId: 'landlord',
            },
            {
                id: '3',
                text: "That would be great! What times work for you this week?",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22),
                senderId: 'user',
            },
        ];
        
        setMessages(mockMessages);
        
        // Scroll chat to bottom after a brief delay
        setTimeout(() => {
            chatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };
    
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    };
    
    const formatChatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const handleSendMessage = () => {
        if (!inputText.trim() || !selectedConversation) return;
        
        const newMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            timestamp: new Date(),
            senderId: 'user',
        };
        
        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        
        // Scroll to bottom
        setTimeout(() => {
            chatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };
    
    const handleBackToConversations = () => {
        setSelectedConversation(null);
        setMessages([]);
        setInputText('');
    };
    
    // Enhanced conversation card component
    const renderConversationCard = ({ item, index }: { item: any; index: number }) => (
        <TouchableOpacity 
            style={[styles.conversationCard, item.unread && styles.unreadCard]}
            onPress={() => handleConversationPress(item.id)}
            activeOpacity={0.7}
        >
            {/* Property Image */}
            <View style={styles.propertyImageContainer}>
                <Image 
                    source={{ uri: item.propertyImage }}
                    style={styles.propertyImage}
                />
                {item.unread && <View style={styles.unreadBadge} />}
            </View>
            
            {/* Content */}
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>{item.propertyTitle}</Text>
                    <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
                </View>
                
                <View style={styles.landlordRow}>
                    <Image 
                        source={{ uri: item.landlordAvatar }}
                        style={styles.landlordAvatar}
                    />
                    <Text style={styles.landlordName}>{item.landlordName}</Text>
                    <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>${item.price}/mo</Text>
                    </View>
                </View>
                
                <Text 
                    style={[styles.lastMessage, item.unread && styles.unreadMessage]} 
                    numberOfLines={2}
                >
                    {item.lastMessage}
                </Text>
            </View>
        </TouchableOpacity>
    );
    
    // Render message bubble
    const renderMessage = ({ item }: { item: Message }) => (
        <ChatBubble
            message={item.text}
            timestamp={formatChatTime(item.timestamp)}
            isOwn={item.senderId === 'user'}
        />
    );
    
    // Chat header with property info
    const renderChatHeader = () => {
        const conversation = conversations.find(c => c.id === selectedConversation);
        if (!conversation) return null;
        
        return (
            <View style={styles.chatHeader}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={handleBackToConversations}
                >
                    <Ionicons name="chevron-back" size={24} color={Blue[600]} />
                </TouchableOpacity>
                
                <Image 
                    source={{ uri: conversation.propertyImage }}
                    style={styles.chatPropertyImage}
                />
                
                <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatPropertyTitle} numberOfLines={1}>
                        {conversation.propertyTitle}
                    </Text>
                    <View style={styles.chatLandlordRow}>
                        <Image 
                            source={{ uri: conversation.landlordAvatar }}
                            style={styles.chatLandlordAvatar}
                        />
                        <Text style={styles.chatLandlordName}>{conversation.landlordName}</Text>
                    </View>
                </View>
                
                <Text style={styles.chatPrice}>${conversation.price}/mo</Text>
            </View>
        );
    };
    
    // Stats header
    const renderStatsHeader = () => {
        const unreadCount = conversations.filter(c => c.unread).length;
        return (
            <View style={styles.statsHeader}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{conversations.length}</Text>
                    <Text style={styles.statLabel}>Conversations</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, unreadCount > 0 && styles.statHighlight]}>{unreadCount}</Text>
                    <Text style={styles.statLabel}>Unread</Text>
                </View>
            </View>
        );
    };

    // Show chat view if conversation is selected
    if (selectedConversation) {
        return (
            <KeyboardAvoidingView 
                style={[styles.container, { paddingTop: insets.top }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={insets.top}
            >
                {/* Chat Header */}
                {renderChatHeader()}
                
                {/* Messages List */}
                <FlatList
                    ref={chatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
                />
                
                {/* Input Bar */}
                <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 8 }]}>
                    <TouchableOpacity style={styles.attachButton}>
                        <Ionicons name="add-circle-outline" size={28} color={Blue[600]} />
                    </TouchableOpacity>
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={Neutral[400]}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    
                    <TouchableOpacity 
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={handleSendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons 
                            name="send" 
                            size={20} 
                            color={inputText.trim() ? '#FFFFFF' : Neutral[400]} 
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        );
    }
    
    // Show conversations list
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <Header 
                title="Matches"
                user={user}
                onProfilePress={() => router.push('/(normal)/profile')}
            />
            
            {conversations.length === 0 ? (
                <EmptyState 
                    icon="chatbubbles-outline"
                    title="No matches yet"
                    description="When landlords respond to your interest, your conversations will appear here."
                />
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderStatsHeader}
                    renderItem={renderConversationCard}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor={Blue[600]}
                        />
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Neutral[50],
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: Spacing.xl,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },
    statNumber: {
        fontSize: Typography.size['2xl'],
        fontWeight: Typography.weight.bold,
        color: Blue[600],
    },
    statHighlight: {
        color: '#EF4444',
    },
    statLabel: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: Neutral[200],
    },
    conversationCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: Spacing.sm,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadCard: {
        borderLeftWidth: 3,
        borderLeftColor: Blue[500],
    },
    propertyImageContainer: {
        position: 'relative',
    },
    propertyImage: {
        width: 70,
        height: 70,
        borderRadius: BorderRadius.md,
        backgroundColor: Neutral[200],
    },
    unreadBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Blue[500],
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    cardContent: {
        flex: 1,
        marginLeft: Spacing.xs,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    propertyTitle: {
        flex: 1,
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
        color: Neutral[900],
        marginRight: Spacing.sm,
    },
    timestamp: {
        fontSize: Typography.size.xs,
        color: Neutral[400],
    },
    landlordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    landlordAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 6,
    },
    landlordName: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        flex: 1,
    },
    priceBadge: {
        backgroundColor: Blue[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priceText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.semibold,
        color: Blue[600],
    },
    lastMessage: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        lineHeight: 18,
        marginTop: 4,
    },
    unreadMessage: {
        color: Neutral[700],
        fontWeight: Typography.weight.medium,
    },
    separator: {
        height: Spacing.sm,
    },
    // Chat view styles
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    backButton: {
        padding: 4,
        marginRight: Spacing.xs,
    },
    chatPropertyImage: {
        width: 45,
        height: 45,
        borderRadius: BorderRadius.md,
        backgroundColor: Neutral[200],
        marginRight: Spacing.xs,
    },
    chatHeaderInfo: {
        flex: 1,
    },
    chatPropertyTitle: {
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
        color: Neutral[900],
    },
    chatLandlordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    chatLandlordAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 4,
    },
    chatLandlordName: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
    },
    chatPrice: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        color: Blue[600],
    },
    messagesContent: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.base,
        flexGrow: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: Neutral[100],
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    attachButton: {
        marginRight: 4,
    },
    input: {
        flex: 1,
        backgroundColor: Neutral[50],
        borderRadius: 20,
        paddingHorizontal: Spacing.base,
        paddingVertical: 8,
        fontSize: Typography.size.base,
        color: Neutral[900],
        maxHeight: 100,
        marginRight: 4,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Blue[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: Neutral[200],
    },
});
