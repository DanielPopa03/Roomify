import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card } from '@/components/ui';
import { Blue, Neutral, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function AdminDashboardScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    // 1. Get logout function from AuthContext
    const { user, dbUser, getAccessToken, logout } = useAuth();

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProperties: 0,
        activeListings: 0,
        pendingReports: 0
    });
    const [refreshing, setRefreshing] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    const fetchStats = async () => {
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/api/admin/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.log("Failed to fetch admin stats");
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
            // AuthContext state change will automatically redirect to Login via RootLayout
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    // Determine display name: DB First Name -> Auth0 Name -> 'Admin'
    const displayName = dbUser?.firstName || user?.name || 'Admin';

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello,</Text>
                    <Text style={styles.adminName}>{displayName}</Text>
                </View>
                <Avatar uri={user?.picture} name={displayName} size={44} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.statsGrid}>
                    <Card elevation={2} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: Blue[50] }]}>
                            <Ionicons name="people" size={24} color={Blue[600]} />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                    </Card>

                    <Card elevation={2} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="home" size={24} color="#10B981" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProperties}</Text>
                        <Text style={styles.statLabel}>Properties</Text>
                    </Card>

                    <Card elevation={2} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="flag" size={24} color="#EF4444" />
                        </View>
                        <Text style={styles.statNumber}>{stats.pendingReports}</Text>
                        <Text style={styles.statLabel}>Pending Reports</Text>
                    </Card>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Management</Text>
                <View style={{ gap: 10 }}>
                    <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(admin)/reports')}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="flag" size={20} color="#EF4444" />
                            </View>
                            <Text style={styles.linkText}>View Reports</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(admin)/roles')}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                            <View style={[styles.iconBox, { backgroundColor: Blue[50] }]}>
                                <Ionicons name="people" size={20} color={Blue[600]} />
                            </View>
                            <Text style={styles.linkText}>Manage Users</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(admin)/banned')}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                                <Ionicons name="ban" size={20} color="#EF4444" />
                            </View>
                            <Text style={styles.linkText}>Banned Users</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    greeting: { fontSize: Typography.size.sm, color: Neutral[500] },
    adminName: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Neutral[900] },
    content: { flex: 1, padding: Spacing.base },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: Spacing.lg },
    statCard: { width: '48%', padding: Spacing.md, marginBottom: Spacing.sm, alignItems: 'flex-start' },
    statIcon: {
        width: 44, height: 44, borderRadius: BorderRadius.lg,
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm
    },
    statNumber: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: Neutral[900] },
    statLabel: { fontSize: Typography.size.sm, color: Neutral[500] },
    sectionTitle: { fontSize: Typography.size.sm, fontWeight: '600', color: Neutral[500], marginBottom: Spacing.sm, marginTop: Spacing.sm },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: BorderRadius.md, ...Shadows.sm },
    linkText: { fontSize: 16, fontWeight: '500', color: Neutral[900] },
    iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    // New Styles for Logout
    logoutButton: {
        marginTop: 30,
        marginBottom: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        gap: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: BorderRadius.md
    },
    logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 16 }
});