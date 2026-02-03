import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Modal,
    Pressable,
    Switch,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function RolesScreen() {
    const insets = useSafeAreaInsets();
    const { getAccessToken } = useAuth();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // --- Modal State ---
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Edit Form State
    const [editRole, setEditRole] = useState<string>('');
    const [editScore, setEditScore] = useState<string>('0');
    const [editIsBanned, setEditIsBanned] = useState<boolean>(false);
    const [saving, setSaving] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    // --- ROLE MAPPING HELPERS ---

    // 1. DB -> UI: Map 'USER' (or 'NORMAL') to 'TENANT' for display
    const getUiRole = (dbRole: string) => {
        if (!dbRole) return 'TENANT';
        if (dbRole === 'USER' || dbRole === 'NORMAL') return 'TENANT';
        return dbRole; // LANDLORD, ADMIN
    };

    // 2. UI -> DB: Map 'TENANT' back to the actual DB Role Name
    // CHANGE 'USER' TO 'NORMAL' HERE IF YOUR DB ROLE IS TRULY 'NORMAL'
    const getDbRole = (uiRole: string) => {
        if (uiRole === 'TENANT') return 'USER';
        return uiRole;
    };

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, [getAccessToken, MY_IP]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const openEditModal = (user: any) => {
        setSelectedUser(user);
        // Map DB role to UI role (e.g., USER -> TENANT)
        setEditRole(getUiRole(user.role?.name));
        setEditScore(String(user.seriousnessScore ?? 0));
        setEditIsBanned(user.isBanned === true);
        setModalVisible(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        setSaving(true);

        try {
            const token = await getAccessToken();
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const promises = [];

            // A. Update Role
            const targetDbRole = getDbRole(editRole); // Converts TENANT -> USER
            const currentDbRole = selectedUser.role?.name || 'USER';

            if (targetDbRole !== currentDbRole) {
                promises.push(
                    fetch(`http://${MY_IP}:8080/api/admin/users/${selectedUser.id}/role`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ role: targetDbRole })
                    })
                );
            }

            // B. Update Ban Status
            if (editIsBanned !== selectedUser.isBanned) {
                promises.push(
                    fetch(`http://${MY_IP}:8080/api/admin/users/${selectedUser.id}/ban`, {
                        method: 'PUT',
                        headers
                    })
                );
            }

            // C. Update Score
            const numScore = parseInt(editScore, 10);
            const currentScore = selectedUser.seriousnessScore ?? 0;
            if (!isNaN(numScore) && numScore !== currentScore) {
                promises.push(
                    fetch(`http://${MY_IP}:8080/api/admin/users/${selectedUser.id}/score`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ score: numScore })
                    })
                );
            }

            await Promise.all(promises);

            // Optimistic Update
            setUsers(prev => prev.map(u =>
                u.id === selectedUser.id ? {
                    ...u,
                    role: { name: targetDbRole },
                    isBanned: editIsBanned,
                    seriousnessScore: isNaN(numScore) ? u.seriousnessScore : numScore
                } : u
            ));

            setModalVisible(false);
        } catch (e) {
            console.error("Failed to update user", e);
        } finally {
            setSaving(false);
        }
    };

    const filtered = users.filter(u => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const query = search.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    const renderItem = ({ item }: { item: any }) => (
        <Card elevation={2} style={[styles.card, item.isBanned && styles.bannedCard]}>
            <View style={styles.row}>
                <Avatar uri={item.picture} name={item.firstName || 'User'} size={48} />
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                        {item.isBanned && <View style={styles.bannedTag}><Text style={styles.bannedText}>BANNED</Text></View>}
                    </View>
                    <Text style={styles.email}>{item.email}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.roleTag}>
                            {/* Display TENANT for USER/NORMAL */}
                            <Text style={styles.roleText}>{getUiRole(item.role?.name)}</Text>
                        </View>
                        <Text style={styles.scoreText}>Score: {item.seriousnessScore ?? 0}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
                    <Ionicons name="settings-outline" size={22} color={Blue[600]} />
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>User Management</Text>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Neutral[400]} />
                    <TextInput style={styles.input} placeholder="Search users..." value={search} onChangeText={setSearch} />
                </View>
            </View>

            {loading ? <ActivityIndicator style={{marginTop:20}}/> :
                <FlatList
                    data={filtered}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={{padding: 16}}
                />
            }

            {/* --- EDIT MODAL --- */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit User</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Neutral[500]} />
                            </TouchableOpacity>
                        </View>

                        {/* 1. ROLE SELECTOR */}
                        <Text style={styles.label}>Role</Text>
                        <View style={styles.roleSelector}>
                            {['TENANT', 'LANDLORD', 'ADMIN'].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.roleOption, editRole === r && styles.roleOptionActive]}
                                    onPress={() => setEditRole(r)}
                                >
                                    <Text style={[styles.roleOptionText, editRole === r && styles.roleOptionTextActive]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 2. SCORE INPUT */}
                        <Text style={styles.label}>Seriousness Score</Text>
                        <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            value={editScore}
                            onChangeText={text => {
                                if (text === '' || text === '-' || /^-?\d*$/.test(text)) {
                                    setEditScore(text);
                                }
                            }}
                        />

                        {/* 3. BAN TOGGLE */}
                        <View style={styles.banRow}>
                            <View>
                                <Text style={styles.label}>Banned Status</Text>
                                <Text style={styles.helperText}>{editIsBanned ? 'User is currently banned' : 'User has access'}</Text>
                            </View>
                            <Switch
                                trackColor={{ false: Neutral[200], true: '#EF4444' }}
                                thumbColor={'#FFF'}
                                onValueChange={setEditIsBanned}
                                value={editIsBanned}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSaveChanges}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                        </TouchableOpacity>

                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    header: { padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Neutral[100], borderRadius: 8, paddingHorizontal: 12, height: 40 },
    input: { flex: 1, marginLeft: 8 },

    card: { padding: 12, marginBottom: 8 },
    bannedCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 },
    row: { flexDirection: 'row', alignItems: 'center' },
    info: { flex: 1, marginLeft: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 16, fontWeight: '600' },
    bannedTag: { backgroundColor: '#EF4444', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
    bannedText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    email: { fontSize: 12, color: Neutral[500] },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 },
    roleTag: { backgroundColor: Blue[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    roleText: { fontSize: 10, color: Blue[700], fontWeight: '700' },
    scoreText: { fontSize: 12, color: Neutral[600] },
    editBtn: { padding: 8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: Neutral[700] },
    helperText: { fontSize: 12, color: Neutral[500] },
    roleSelector: { flexDirection: 'row', backgroundColor: Neutral[100], borderRadius: 8, padding: 4, marginBottom: 20 },
    roleOption: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
    roleOptionActive: { backgroundColor: '#FFF', ...Shadows.sm },
    roleOptionText: { fontSize: 12, fontWeight: '600', color: Neutral[500] },
    roleOptionTextActive: { color: Blue[600] },
    scoreInput: { backgroundColor: Neutral[50], borderWidth: 1, borderColor: Neutral[200], borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
    banRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, padding: 12, backgroundColor: Neutral[50], borderRadius: 8, borderWidth: 1, borderColor: Neutral[200] },
    saveBtn: { backgroundColor: Blue[600], paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});