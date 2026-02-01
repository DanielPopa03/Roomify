import React, { useState, useCallback } from 'react';

const formatSeconds = (sec: number) => {
    if (!sec || sec <= 0) return '0s';
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};
import {
    View, Text, FlatList, StyleSheet, Image, TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import { Ionicons } from '@expo/vector-icons';

import { Header, EmptyState } from '@/components/ui'; // Assuming these exist based on context
import { Blue, Neutral, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function MatchScreen() {
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
            // Call the NEW Tenant endpoint
            const response = await fetch(`http://${MY_IP}:8080/api/chats/tenant`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();

                // Fix image URLs if necessary (localhost -> IP)
                const formattedData = data.map((item: any) => ({
                    ...item,
                    propertyImage: item.propertyImage?.startsWith('http')
                        ? item.propertyImage.replace('localhost', MY_IP).replace('127.0.0.1', MY_IP)
                        : null
                }));

                setConversations(formattedData);
            }
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [getAccessToken, MY_IP]);

    // Refresh automatically when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [fetchConversations])
    );

    const handleChatPress = (chatId: string, landlordName: string, propertyTitle: string, landlordId?: string) => {
        router.push({
            pathname: '/(normal)/chat-room',
            params: { chatId, title: landlordName, subTitle: propertyTitle, otherUserId: landlordId }
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.conversationCard, item.unreadCount > 0 && styles.unreadCard]}
            onPress={() => handleChatPress(item.id, item.landlordName, item.propertyTitle, item.landlordId)}
            activeOpacity={0.7}
        >
            <View style={styles.propertyImageContainer}>
                {item.propertyImage ? (
                    <Image source={{ uri: item.propertyImage }} style={styles.propertyImage} />
                ) : (
                    <View style={[styles.propertyImage, { backgroundColor: Neutral[200] }]} />
                )}
                {item.unreadCount > 0 && <View style={styles.unreadBadge} />}
            </View>

            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>{item.propertyTitle}</Text>
                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>

                <View style={styles.landlordRow}>
                    <Ionicons name="person-circle-outline" size={16} color={Neutral[500]} style={{ marginRight: 4 }} />
                    <Text style={styles.landlordName}>{item.landlordName}</Text>
                    {item.price && (
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceText}>€{item.price}/mo</Text>
                        </View>
                    )}
                </View>

                {item.timeLeftSeconds > 0 && !item.tenantMessaged ? (
                    <Text style={styles.countdownSmall}>Time left to message: {formatSeconds(item.timeLeftSeconds)}</Text>
                ) : item.tenantMessaged ? (
                    <Text style={styles.countdownSmall}>You have messaged ✔️</Text>
                ) : null}

                <Text
                    style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadMessage]}
                    numberOfLines={2}
                >
                    {item.lastMessage}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Reusing CustomHeader logic from _layout indirectly via generic Header component or custom implementation */}
            <Header
                title="Matches"
                user={user}
                onProfilePress={() => router.push('/(normal)/profile')}
            />

            <View style={{ paddingHorizontal: Spacing.md }}>
                <Text style={{ fontSize: 12, color: Neutral[500], marginTop: 6 }}>Time left shows how long you have to send the first message after a match.</Text>
            </View>

            {isLoading ? (
                <View style={styles.centered}><ActivityIndicator color={Blue[600]} /></View>
            ) : conversations.length === 0 ? (
                <EmptyState
                    icon="chatbubbles-outline"
                    title="No matches yet"
                    description="Swipe right on properties! When a landlord swipes back, your chat will appear here."
                />
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor={Blue[600]} />
                    }
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: Spacing.md, paddingBottom: 100 },
    conversationCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadCard: { borderLeftWidth: 3, borderLeftColor: Blue[500] },
    propertyImageContainer: { position: 'relative', marginRight: Spacing.md },
    propertyImage: { width: 60, height: 60, borderRadius: BorderRadius.md, backgroundColor: Neutral[100] },
    unreadBadge: {
        position: 'absolute', top: -4, right: -4, width: 12, height: 12,
        borderRadius: 6, backgroundColor: Blue[500], borderWidth: 2, borderColor: '#FFFFFF',
    },
    cardContent: { flex: 1, justifyContent: 'center' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    propertyTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Neutral[900], flex: 1 },
    timestamp: { fontSize: Typography.size.xs, color: Neutral[400] },
    landlordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    countdownSmall: { fontSize: 12, color: Neutral[500], marginTop: 4 },
    landlordName: { fontSize: Typography.size.xs, color: Neutral[500], marginRight: 8 },
    priceBadge: { backgroundColor: Blue[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    priceText: { fontSize: 10, fontWeight: 'bold', color: Blue[600] },
    lastMessage: { fontSize: Typography.size.sm, color: Neutral[500] },
    unreadMessage: { color: Neutral[900], fontWeight: '600' },
});