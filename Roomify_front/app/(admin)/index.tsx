import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card } from '@/components/ui';
import { Blue, BorderRadius, Neutral, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// Mock dashboard stats
const STATS = {
    totalUsers: 1247,
    totalProperties: 523,
    activeListings: 412,
    pendingReports: 8,
    newUsersToday: 23,
    newPropertiesToday: 7,
};

// Mock recent activity
const RECENT_ACTIVITY = [
    { id: '1', type: 'user', message: 'New user registered: John Smith', time: '5m ago' },
    { id: '2', type: 'property', message: 'New property listed: Modern Apartment', time: '12m ago' },
    { id: '3', type: 'report', message: 'Report filed against user: Mike99', time: '1h ago' },
    { id: '4', type: 'user', message: 'User role changed: Sarah → Landlord', time: '2h ago' },
    { id: '5', type: 'property', message: 'Property removed: Old House', time: '3h ago' },
];

export default function AdminDashboardScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'user': return 'person';
            case 'property': return 'home';
            case 'report': return 'flag';
            default: return 'information-circle';
        }
    };
    
    const getActivityColor = (type: string) => {
        switch (type) {
            case 'user': return Blue[600];
            case 'property': return '#10B981';
            case 'report': return '#EF4444';
            default: return Neutral[500];
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.adminName}>{user?.name || 'Admin'}</Text>
                </View>
                <Avatar uri={user?.picture} name={user?.name || 'Admin'} size={44} />
            </View>
            
            <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <Card elevation={2} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: Blue[50] }]}>
                            <Ionicons name="people" size={24} color={Blue[600]} />
                        </View>
                        <Text style={styles.statNumber}>{STATS.totalUsers.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                        <Text style={styles.statChange}>+{STATS.newUsersToday} today</Text>
                    </Card>
                    
                    <Card elevation={2} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="home" size={24} color="#10B981" />
                        </View>
                        <Text style={styles.statNumber}>{STATS.totalProperties.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Properties</Text>
                        <Text style={styles.statChange}>+{STATS.newPropertiesToday} today</Text>
                    </Card>
                    
                    <Card elevation={2} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                        </View>
                        <Text style={styles.statNumber}>{STATS.activeListings.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Active Listings</Text>
                    </Card>
                    
                    <Card elevation={2} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="flag" size={24} color="#EF4444" />
                        </View>
                        <Text style={styles.statNumber}>{STATS.pendingReports}</Text>
                        <Text style={styles.statLabel}>Pending Reports</Text>
                        <TouchableOpacity onPress={() => router.push('/(admin)/reports')}>
                            <Text style={styles.viewLink}>View all</Text>
                        </TouchableOpacity>
                    </Card>
                </View>
                
                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(admin)/reports')}>
                        <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="flag" size={22} color="#EF4444" />
                        </View>
                        <Text style={styles.actionText}>Review Reports</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(admin)/roles')}>
                        <View style={[styles.actionIcon, { backgroundColor: Blue[50] }]}>
                            <Ionicons name="shield" size={22} color={Blue[600]} />
                        </View>
                        <Text style={styles.actionText}>Manage Roles</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton}>
                        <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="stats-chart" size={22} color="#10B981" />
                        </View>
                        <Text style={styles.actionText}>Analytics</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Recent Activity */}
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <Card elevation={2} style={styles.activityCard}>
                    {RECENT_ACTIVITY.map((activity, index) => (
                        <View 
                            key={activity.id} 
                            style={[
                                styles.activityItem,
                                index === RECENT_ACTIVITY.length - 1 && styles.activityItemLast
                            ]}
                        >
                            <View style={[
                                styles.activityIconContainer,
                                { backgroundColor: getActivityColor(activity.type) + '20' }
                            ]}>
                                <Ionicons 
                                    name={getActivityIcon(activity.type)} 
                                    size={16} 
                                    color={getActivityColor(activity.type)} 
                                />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={styles.activityMessage}>{activity.message}</Text>
                                <Text style={styles.activityTime}>{activity.time}</Text>
                            </View>
                        </View>
                    ))}
                </Card>
                
                {/* Switch Role */}
                <TouchableOpacity 
                    style={styles.switchRoleButton}
                    onPress={() => router.replace('/')}
                >
                    <Ionicons name="swap-horizontal" size={20} color={Blue[600]} />
                    <Text style={styles.switchRoleText}>Switch Role</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Neutral[50],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.lg,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    greeting: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
    },
    adminName: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        color: Neutral[900],
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.base,
        paddingBottom: 100,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    statCard: {
        width: '48%',
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        alignItems: 'flex-start',
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    statNumber: {
        fontSize: Typography.size['2xl'],
        fontWeight: Typography.weight.bold,
        color: Neutral[900],
    },
    statLabel: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
    },
    statChange: {
        fontSize: Typography.size.xs,
        color: '#10B981',
        marginTop: 4,
    },
    viewLink: {
        fontSize: Typography.size.xs,
        color: Blue[600],
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        color: Neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginHorizontal: 4,
        ...Shadows.sm,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    actionText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
        color: Neutral[700],
        textAlign: 'center',
    },
    activityCard: {
        marginBottom: Spacing.lg,
        overflow: 'hidden',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    activityItemLast: {
        borderBottomWidth: 0,
    },
    activityIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    activityContent: {
        flex: 1,
    },
    activityMessage: {
        fontSize: Typography.size.sm,
        color: Neutral[800],
    },
    activityTime: {
        fontSize: Typography.size.xs,
        color: Neutral[400],
        marginTop: 2,
    },
    switchRoleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
    },
    switchRoleText: {
        fontSize: Typography.size.base,
        color: Blue[600],
        fontWeight: Typography.weight.medium,
    },
});
