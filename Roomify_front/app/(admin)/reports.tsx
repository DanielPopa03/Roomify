import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, Card, Button, Avatar, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// Mock reports data
const MOCK_REPORTS = [
    { 
        id: '1', 
        reportedUser: 'Mike Johnson',
        reportedUserAvatar: 'https://randomuser.me/api/portraits/men/45.jpg',
        reportedBy: 'Sarah Williams',
        reason: 'Inappropriate behavior', 
        description: 'User was sending inappropriate messages during property viewing.',
        category: 'behavior',
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    { 
        id: '2', 
        reportedUser: 'Jane Smith',
        reportedUserAvatar: 'https://randomuser.me/api/portraits/women/22.jpg',
        reportedBy: 'Tom Hardy',
        reason: 'Fake listing', 
        description: 'The listed property does not exist at the given address.',
        category: 'listing',
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    { 
        id: '3', 
        reportedUser: 'John Doe',
        reportedUserAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        reportedBy: 'Emily Davis',
        reason: 'Spam', 
        description: 'User is sending the same message to all landlords.',
        category: 'spam',
        status: 'resolved',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    },
    { 
        id: '4', 
        reportedUser: 'Alex Brown',
        reportedUserAvatar: 'https://randomuser.me/api/portraits/men/52.jpg',
        reportedBy: 'Lisa Chen',
        reason: 'Harassment', 
        description: 'User continued messaging after being asked to stop.',
        category: 'behavior',
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
];

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'resolved', label: 'Resolved' },
];

export default function ReportsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    
    const [reports, setReports] = useState(MOCK_REPORTS);
    const [activeFilter, setActiveFilter] = useState('all');
    
    const filteredReports = reports.filter(r => {
        if (activeFilter === 'all') return true;
        return r.status === activeFilter;
    });
    
    const handleResolve = (reportId: string) => {
        Alert.alert(
            'Resolve Report',
            'Mark this report as resolved?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Resolve', 
                    onPress: () => {
                        setReports(prev => 
                            prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r)
                        );
                    }
                }
            ]
        );
    };
    
    const handleDelete = (reportId: string) => {
        Alert.alert(
            'Delete Report',
            'Are you sure you want to delete this report?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                        setReports(prev => prev.filter(r => r.id !== reportId));
                    }
                }
            ]
        );
    };
    
    const handleBanUser = (userName: string) => {
        Alert.alert(
            'Ban User',
            `Are you sure you want to ban ${userName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Ban User', 
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Success', `${userName} has been banned.`);
                    }
                }
            ]
        );
    };
    
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };
    
    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'behavior': return '#EF4444';
            case 'listing': return '#F59E0B';
            case 'spam': return '#6366F1';
            default: return Neutral[500];
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Reports</Text>
                <Text style={styles.headerSubtitle}>
                    {reports.filter(r => r.status === 'pending').length} pending
                </Text>
            </View>
            
            {/* Filters */}
            <View style={styles.filterContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    {FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter.id}
                            style={[
                                styles.filterChip,
                                activeFilter === filter.id && styles.filterChipActive
                            ]}
                            onPress={() => setActiveFilter(filter.id)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                activeFilter === filter.id && styles.filterChipTextActive
                            ]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            
            {filteredReports.length === 0 ? (
                <EmptyState 
                    icon="flag-outline"
                    title="No reports"
                    description="There are no reports to review at this time."
                />
            ) : (
                <FlatList
                    data={filteredReports}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <Card elevation={2} style={styles.reportCard}>
                            {/* Header */}
                            <View style={styles.reportHeader}>
                                <View style={styles.reportUser}>
                                    <Avatar 
                                        uri={item.reportedUserAvatar} 
                                        name={item.reportedUser} 
                                        size={44} 
                                    />
                                    <View>
                                        <Text style={styles.reportUserName}>{item.reportedUser}</Text>
                                        <Text style={styles.reportTime}>{formatTime(item.createdAt)}</Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    item.status === 'pending' ? styles.statusPending : styles.statusResolved
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        item.status === 'pending' ? styles.statusTextPending : styles.statusTextResolved
                                    ]}>
                                        {item.status === 'pending' ? 'Pending' : 'Resolved'}
                                    </Text>
                                </View>
                            </View>
                            
                            {/* Report Details */}
                            <View style={styles.reportDetails}>
                                <View style={styles.reasonRow}>
                                    <View style={[
                                        styles.categoryBadge,
                                        { backgroundColor: getCategoryColor(item.category) + '20' }
                                    ]}>
                                        <Text style={[
                                            styles.categoryText,
                                            { color: getCategoryColor(item.category) }
                                        ]}>
                                            {item.reason}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.description}>{item.description}</Text>
                                <Text style={styles.reportedBy}>
                                    Reported by: {item.reportedBy}
                                </Text>
                            </View>
                            
                            {/* Actions */}
                            {item.status === 'pending' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity 
                                        style={styles.actionButton}
                                        onPress={() => handleResolve(item.id)}
                                    >
                                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                        <Text style={[styles.actionText, { color: '#10B981' }]}>Resolve</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.actionButton}
                                        onPress={() => handleBanUser(item.reportedUser)}
                                    >
                                        <Ionicons name="ban" size={18} color="#EF4444" />
                                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Ban User</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.actionButton}
                                        onPress={() => handleDelete(item.id)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={Neutral[500]} />
                                        <Text style={[styles.actionText, { color: Neutral[500] }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Card>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
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
    header: {
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.lg,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    headerTitle: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        color: Neutral[900],
    },
    headerSubtitle: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginTop: 4,
    },
    filterContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[100],
    },
    filterScroll: {
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Neutral[100],
        marginRight: Spacing.sm,
    },
    filterChipActive: {
        backgroundColor: Blue[600],
    },
    filterChipText: {
        fontSize: Typography.size.sm,
        color: Neutral[600],
        fontWeight: Typography.weight.medium,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: 100,
    },
    reportCard: {
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    reportUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    reportUserName: {
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
        color: Neutral[900],
    },
    reportTime: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    statusPending: {
        backgroundColor: '#FEF3C7',
    },
    statusResolved: {
        backgroundColor: '#DCFCE7',
    },
    statusText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
    },
    statusTextPending: {
        color: '#D97706',
    },
    statusTextResolved: {
        color: '#16A34A',
    },
    reportDetails: {
        marginBottom: Spacing.md,
    },
    reasonRow: {
        marginBottom: Spacing.sm,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.md,
    },
    categoryText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
    },
    description: {
        fontSize: Typography.size.sm,
        color: Neutral[700],
        lineHeight: 20,
    },
    reportedBy: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginTop: Spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: Neutral[100],
        paddingTop: Spacing.md,
        gap: Spacing.lg,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
    },
});
