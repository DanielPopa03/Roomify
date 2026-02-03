import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function BannedUsersScreen() {
    const insets = useSafeAreaInsets();
    const { getAccessToken } = useAuth();

    const [bannedUsers, setBannedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // --- Modal State ---
    const [modalVisible, setModalVisible] = useState(false);
    const [userToUnban, setUserToUnban] = useState<any>(null);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    const fetchBannedUsers = useCallback(async () => {
        try {
            const token = await getAccessToken();
            // Fetch all users and filter client-side for now
            const response = await fetch(`http://${MY_IP}:8080/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Filter specifically for banned users
                const banned = data.filter((u: any) => u.isBanned === true);
                setBannedUsers(banned);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getAccessToken, MY_IP]);

    useEffect(() => {
        fetchBannedUsers();
    }, [fetchBannedUsers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBannedUsers();
    };

    // 1. Open Confirmation Modal
    const handleUnbanPress = (user: any) => {
        setUserToUnban(user);
        setModalVisible(true);
    };

    // 2. Execute API Call
    const confirmUnban = async () => {
        if (!userToUnban) return;
        setModalVisible(false); // Close modal immediately

        try {
            const token = await getAccessToken();
            const res = await fetch(`http://${MY_IP}:8080/api/admin/users/${userToUnban.id}/ban`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                // Remove from list immediately
                setBannedUsers(prev => prev.filter(u => u.id !== userToUnban.id));
            }
        } catch (e) {
            console.error("Failed to unban user", e);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const displayName = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email;

        return (
            <Card elevation={2} style={styles.card}>
                <View style={styles.row}>
                    <Avatar uri={item.picture} name={displayName} size={48} />
                    <View style={styles.info}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name}>{displayName}</Text>
                            <View style={styles.bannedBadge}>
                                <Text style={styles.bannedText}>BANNED</Text>
                            </View>
                        </View>
                        <Text style={styles.email}>{item.email}</Text>
                        <Text style={styles.roleText}>{item.role?.name}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.unbanButton}
                        onPress={() => handleUnbanPress(item)}
                    >
                        <Ionicons name="refresh" size={18} color="#16A34A" />
                        <Text style={styles.unbanText}>Revoke Ban</Text>
                    </TouchableOpacity>
                </View>
            </Card>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Banned Users</Text>
                <Text style={styles.headerSubtitle}>{bannedUsers.length} restricted accounts</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" color={Blue[600]} />
            ) : bannedUsers.length === 0 ? (
                <EmptyState
                    icon="shield-checkmark-outline"
                    title="No Banned Users"
                    description="There are currently no users banned from the platform."
                />
            ) : (
                <FlatList
                    data={bannedUsers}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}

            {/* --- CUSTOM CONFIRMATION MODAL (Web Compatible) --- */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={32} color="#16A34A" />
                        </View>

                        <Text style={styles.modalTitle}>Unban User?</Text>
                        <Text style={styles.modalSubtitle}>
                            Are you sure you want to unban <Text style={{fontWeight: '700', color: Neutral[900]}}>{userToUnban?.firstName}</Text>?
                            They will immediately regain access to the platform.
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.btnCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.btnConfirm]}
                                onPress={confirmUnban}
                            >
                                <Text style={styles.btnConfirmText}>Confirm Unban</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    header: {
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.lg,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100]
    },
    headerTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Neutral[900] },
    headerSubtitle: { fontSize: Typography.size.sm, color: Neutral[500], marginTop: 4 },

    listContent: { padding: Spacing.base, paddingBottom: 100 },

    card: { padding: Spacing.md, marginBottom: Spacing.sm },
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    info: { flex: 1, marginLeft: 12 },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    name: { fontSize: 16, fontWeight: '600', color: Neutral[900] },

    bannedBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    bannedText: { color: '#EF4444', fontSize: 10, fontWeight: 'bold' },

    email: { fontSize: 12, color: Neutral[500], marginTop: 2 },
    roleText: { fontSize: 10, color: Blue[600], fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },

    actions: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Neutral[100],
        alignItems: 'flex-end'
    },
    unbanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#DCFCE7',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8
    },
    unbanText: { color: '#16A34A', fontWeight: '600', fontSize: 14 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        ...Shadows.lg
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: Neutral[900] },
    modalSubtitle: { fontSize: 14, color: Neutral[600], marginBottom: 24, textAlign: 'center', lineHeight: 20 },
    modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    btnCancel: { backgroundColor: Neutral[100] },
    btnCancelText: { color: Neutral[700], fontWeight: '600' },
    btnConfirm: { backgroundColor: '#16A34A' },
    btnConfirmText: { color: '#FFF', fontWeight: '600' }
});