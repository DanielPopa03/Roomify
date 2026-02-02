import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Modal,
    Pressable,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ReportsScreen() {
    const insets = useSafeAreaInsets();
    const { getAccessToken } = useAuth();

    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('PENDING');

    // --- Modal State ---
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any>(null);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setReports(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [getAccessToken, MY_IP]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const openResolveModal = (report: any) => {
        setSelectedReport(report);
        setModalVisible(true);
    };

    // 1. EXECUTE ACTIONS
    const executeAction = async (actionType: 'RESOLVE' | 'DISMISS', payload?: string) => {
        if (!selectedReport) return;
        setModalVisible(false);

        const token = await getAccessToken();
        let url = '';
        let method = 'PUT';

        try {
            if (actionType === 'DISMISS') {
                // Call Dismiss Endpoint
                url = `http://${MY_IP}:8080/api/reports/${selectedReport.id}/dismiss`;

                const res = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: 'DISMISSED' } : r));
                }
            } else {
                // Call Resolve Endpoint (payload = NONE, BAN, PENALIZE)
                url = `http://${MY_IP}:8080/api/reports/${selectedReport.id}/resolve?action=${payload}`;

                const res = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: 'RESOLVED' } : r));
                }
            }
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setSelectedReport(null);
        }
    };

    // 2. DELETE (Hard Delete)
    const handleDelete = async (reportId: string) => {
        try {
            const token = await getAccessToken();
            const res = await fetch(`http://${MY_IP}:8080/api/reports/${reportId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setReports(prev => prev.filter(r => r.id !== reportId));
            }
        } catch (error) {
            console.error("Failed to delete report", error);
        }
    };

    const filteredReports = reports.filter(r => activeFilter === 'ALL' ? true : r.status === activeFilter);

    const getCategoryColor = (reason: string) => {
        if (!reason) return Blue[500];
        if (reason.includes('HARASSMENT') || reason.includes('SCAM')) return '#EF4444';
        return Blue[500];
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card elevation={2} style={styles.card}>
            <View style={styles.header}>
                <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                    <Avatar uri={item.reportedUser?.picture} name={item.reportedUser?.firstName || 'User'} size={40} />
                    <View>
                        <Text style={styles.name}>{item.reportedUser?.firstName} {item.reportedUser?.lastName}</Text>
                        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                </View>
                <View style={[styles.badge,
                    item.status === 'PENDING' ? styles.badgePending :
                        item.status === 'DISMISSED' ? styles.badgeDismissed : styles.badgeResolved
                ]}>
                    <Text style={[styles.badgeText, {
                        color: item.status === 'PENDING' ? '#D97706' :
                            item.status === 'DISMISSED' ? Neutral[600] : '#16A34A'
                    }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.body}>
                <View style={[styles.reasonChip, { backgroundColor: getCategoryColor(item.reason) + '20' }]}>
                    <Text style={[styles.reasonText, { color: getCategoryColor(item.reason) }]}>{item.reason}</Text>
                </View>
                <Text style={styles.desc}>{item.description}</Text>
                {item.contentSnapshot && (
                    <View style={styles.snapshot}>
                        <Text style={styles.snapshotLabel}>Context:</Text>
                        <Text style={styles.snapshotText}>"{item.contentSnapshot}"</Text>
                    </View>
                )}
                <Text style={styles.reporter}>Reported by: {item.reporter?.firstName}</Text>
            </View>

            {item.status === 'PENDING' && (
                <View style={styles.actions}>
                    {/* RESOLVE BUTTON (Opens Modal containing Dismiss/Resolve/Ban) */}
                    <TouchableOpacity style={styles.btn} onPress={() => openResolveModal(item)}>
                        <Ionicons name="shield-checkmark" size={18} color={Blue[600]} />
                        <Text style={[styles.btnText, { color: Blue[600] }]}>Resolve Report...</Text>
                    </TouchableOpacity>

                    {/* DELETE BUTTON (Hard Delete) */}
                    <TouchableOpacity style={styles.btnIconOnly} onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Clean up non-pending items */}
            {item.status !== 'PENDING' && (
                <View style={styles.actions}>
                    <View style={{flex: 1}} />
                    <TouchableOpacity style={styles.btn} onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={[styles.btnText, { color: '#EF4444' }]}>Delete Permanently</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.topBar}>
                <Text style={styles.title}>Reports</Text>
            </View>
            <View style={styles.tabs}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{padding: 16}}>
                    {['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'].map(f => (
                        <TouchableOpacity key={f} style={[styles.tab, activeFilter === f && styles.tabActive]} onPress={() => setActiveFilter(f)}>
                            <Text style={[styles.tabText, activeFilter === f && styles.tabTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? <ActivityIndicator style={{marginTop:20}} /> :
                filteredReports.length === 0 ? <EmptyState icon="flag-outline" title="No reports" description="All caught up!" /> :
                    <FlatList data={filteredReports} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{padding: 16}} />
            }

            {/* --- ACTION MODAL --- */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Handle Report</Text>
                        <Text style={styles.modalSubtitle}>
                            Select an outcome for: {selectedReport?.reportedUser?.firstName}
                        </Text>

                        {/* OPTION 1: DISMISS */}
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: Neutral[100] }]}
                            onPress={() => executeAction('DISMISS')}
                        >
                            <Ionicons name="close-circle" size={20} color={Neutral[600]} />
                            <Text style={[styles.modalBtnText, { color: Neutral[600] }]}>Dismiss (Mark Invalid)</Text>
                        </TouchableOpacity>

                        {/* OPTION 2: RESOLVE (NO ACTION) */}
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: Blue[50] }]}
                            onPress={() => executeAction('RESOLVE', 'NONE')}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={Blue[600]} />
                            <Text style={[styles.modalBtnText, { color: Blue[600] }]}>Resolve (No Penalty)</Text>
                        </TouchableOpacity>

                        {/* OPTION 3: PENALIZE */}
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: '#FEF3C7' }]}
                            onPress={() => executeAction('RESOLVE', 'PENALIZE')}
                        >
                            <Ionicons name="thumbs-down" size={20} color="#D97706" />
                            <Text style={[styles.modalBtnText, { color: '#D97706' }]}>Penalize Score (-1)</Text>
                        </TouchableOpacity>

                        {/* OPTION 4: BAN */}
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: '#FEE2E2' }]}
                            onPress={() => executeAction('RESOLVE', 'BAN')}
                        >
                            <Ionicons name="ban" size={20} color="#EF4444" />
                            <Text style={[styles.modalBtnText, { color: '#EF4444' }]}>Ban User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalBtn, { marginTop: 10, borderTopWidth: 1, borderColor: Neutral[200], borderRadius: 0, backgroundColor: 'transparent' }]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{ color: Neutral[500], fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    topBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: Neutral[100] },
    title: { fontSize: 24, fontWeight: 'bold', color: Neutral[900] },
    tabs: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: Neutral[100] },
    tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: Neutral[100], marginRight: 8 },
    tabActive: { backgroundColor: Blue[600] },
    tabText: { fontSize: 14, color: Neutral[600], fontWeight: '500' },
    tabTextActive: { color: '#fff' },
    card: { marginBottom: 12, padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    name: { fontSize: 16, fontWeight: '600' },
    date: { fontSize: 12, color: Neutral[500] },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgePending: { backgroundColor: '#FEF3C7' },
    badgeResolved: { backgroundColor: '#DCFCE7' },
    badgeDismissed: { backgroundColor: Neutral[200] },
    badgeText: { fontSize: 12, fontWeight: '700' },
    body: { marginBottom: 12 },
    reasonChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8 },
    reasonText: { fontSize: 12, fontWeight: '600' },
    desc: { color: Neutral[700], fontSize: 14, lineHeight: 20 },
    snapshot: { marginTop: 8, padding: 8, backgroundColor: Neutral[100], borderLeftWidth: 3, borderLeftColor: Blue[400], borderRadius: 4 },
    snapshotLabel: { fontSize: 10, fontWeight: 'bold', color: Neutral[500] },
    snapshotText: { fontSize: 12, fontStyle: 'italic', color: Neutral[800] },
    reporter: { marginTop: 8, fontSize: 12, color: Neutral[400] },
    actions: { flexDirection: 'row', borderTopWidth: 1, borderColor: Neutral[100], paddingTop: 12, gap: 12, alignItems: 'center' },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    btnIconOnly: { padding: 4, marginLeft: 'auto' }, // Pushes trash icon to the right
    btnText: { fontSize: 14, fontWeight: '600' },

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
        borderRadius: 16,
        padding: 20,
        ...Shadows.lg
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: Neutral[500], textAlign: 'center', marginBottom: 20 },
    modalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 8,
        gap: 8
    },
    modalBtnText: { fontWeight: '600', fontSize: 14 }
});