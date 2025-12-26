// (landlord)/chat.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LandlordChatListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { getAccessToken, user } = useAuth();

    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    const fetchConversations = useCallback(async () => {
        try {
            const token = await getAccessToken();
            // Assuming an endpoint exists for fetching active matches/chats
            const response = await fetch(`http://${MY_IP}:8080/api/chats/landlord`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setConversations(data);
            } else {
                // Mock data for UI demonstration if backend isn't ready
                setConversations([
                    {
                        id: '1',
                        tenantName: 'Sarah Jenkins',
                        tenantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
                        lastMessage: 'Is the apartment still available?',
                        timestamp: '10:30 AM',
                        unreadCount: 2,
                        propertyTitle: 'Sunset Apartments, Unit 4B'
                    },
                    {
                        id: '2',
                        tenantName: 'Michael Chen',
                        tenantAvatar: null,
                        lastMessage: 'Thanks for the tour yesterday!',
                        timestamp: 'Yesterday',
                        unreadCount: 0,
                        propertyTitle: 'Downtown Loft'
                    }
                ]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [getAccessToken, MY_IP]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleChatPress = (chatId: string, tenantName: string) => {
        router.push({
            pathname: '/(landlord)/chat-room',
            params: { chatId, title: tenantName }
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => handleChatPress(item.id, item.tenantName)}
        >
            <View style={styles.avatarContainer}>
                {item.tenantAvatar ? (
                    <Image source={{ uri: item.tenantAvatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                        <Text style={styles.placeholderText}>{item.tenantName.charAt(0)}</Text>
                    </View>
                )}
            </View>

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.name}>{item.tenantName}</Text>
                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>
                <Text style={styles.propertyLabel} numberOfLines={1}>{item.propertyTitle}</Text>
                <View style={styles.messageRow}>
                    <Text style={[styles.message, item.unreadCount > 0 && styles.messageBold]} numberOfLines={1}>
                        {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header
                title="Messages"
                user={user}
                onProfilePress={() => router.push('/(landlord)/profile')}
            />

            {conversations.length === 0 && !isLoading ? (
                <EmptyState
                    icon="chatbubbles-outline"
                    title="No messages yet"
                    description="Once you match with a tenant, you can start chatting here."
                />
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    listContent: { paddingBottom: 100 },
    chatItem: {
        flexDirection: 'row',
        padding: Spacing.md,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    avatarContainer: { marginRight: Spacing.md },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    placeholderAvatar: { backgroundColor: Blue[100], justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 20, color: Blue[600], fontWeight: 'bold' },
    chatContent: { flex: 1, justifyContent: 'center' },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    name: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Neutral[900] },
    timestamp: { fontSize: Typography.size.xs, color: Neutral[400] },
    propertyLabel: { fontSize: Typography.size.xs, color: Blue[600], marginBottom: 4 },
    messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    message: { fontSize: Typography.size.sm, color: Neutral[500], flex: 1, marginRight: Spacing.sm },
    messageBold: { color: Neutral[900], fontWeight: Typography.weight.medium },
    badge: { backgroundColor: Blue[600], borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
});