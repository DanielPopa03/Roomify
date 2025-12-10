import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header, Card, Button, Avatar, EmptyState } from '@/components/ui';
import { Blue, Neutral, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAdminUsers, useAdminMutations } from '@/hooks/useApi';

// Mock users data (fallback)
const MOCK_USERS = [
    { 
        id: '1', 
        name: 'John Doe', 
        email: 'john@example.com', 
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        role: 'tenant',
        status: 'active',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    },
    { 
        id: '2', 
        name: 'Jane Smith', 
        email: 'jane@example.com', 
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        role: 'landlord',
        status: 'active',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
    },
    { 
        id: '3', 
        name: 'Mike Johnson', 
        email: 'mike@example.com', 
        avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
        role: 'tenant',
        status: 'active',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    },
    { 
        id: '4', 
        name: 'Sarah Williams', 
        email: 'sarah@example.com', 
        avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
        role: 'admin',
        status: 'active',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
    },
    { 
        id: '5', 
        name: 'Tom Hardy', 
        email: 'tom@example.com', 
        avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
        role: 'landlord',
        status: 'suspended',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
    },
];

const ROLE_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'tenant', label: 'Tenants' },
    { id: 'landlord', label: 'Landlords' },
    { id: 'admin', label: 'Admins' },
];

export default function RolesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    
    // API hooks
    const { data: apiUsers, isLoading, error, refetch } = useAdminUsers();
    const { updateUserRole } = useAdminMutations();
    
    const [users, setUsers] = useState(MOCK_USERS);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    
    // Update users when API data arrives
    useEffect(() => {
        if (apiUsers && apiUsers.length > 0) {
            setUsers(apiUsers.map(u => ({
                id: u.id,
                name: u.firstName || u.email?.split('@')[0] || 'Unknown',
                email: u.email || '',
                avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
                role: u.role?.name?.toLowerCase() || 'tenant',
                status: 'active',
                joinedAt: new Date(u.createdAt || Date.now()),
            })));
        }
    }, [apiUsers]);
    
    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };
    
    const filteredUsers = users.filter(u => {
        const matchesFilter = activeFilter === 'all' || u.role === activeFilter;
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });
    
    const handleChangeRole = (userId: string, currentRole: string) => {
        const roles = ['tenant', 'landlord', 'admin'];
        const currentIndex = roles.indexOf(currentRole);
        const nextRole = roles[(currentIndex + 1) % roles.length];
        
        Alert.alert(
            'Change Role',
            `Change role from ${currentRole} to ${nextRole}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Change', 
                    onPress: async () => {
                        // Call API to update role
                        const result = await updateUserRole(userId, nextRole.toUpperCase());
                        if (result) {
                            setUsers(prev => 
                                prev.map(u => u.id === userId ? { ...u, role: nextRole } : u)
                            );
                        } else {
                            // Fallback for mock mode
                            setUsers(prev => 
                                prev.map(u => u.id === userId ? { ...u, role: nextRole } : u)
                            );
                        }
                    }
                }
            ]
        );
    };
    
    const handleToggleStatus = (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        Alert.alert(
            newStatus === 'suspended' ? 'Suspend User' : 'Activate User',
            `Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this user?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Confirm', 
                    style: newStatus === 'suspended' ? 'destructive' : 'default',
                    onPress: () => {
                        setUsers(prev => 
                            prev.map(u => u.id === userId ? { ...u, status: newStatus } : u)
                        );
                    }
                }
            ]
        );
    };
    
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return '#EF4444';
            case 'landlord': return '#F59E0B';
            case 'tenant': return Blue[600];
            default: return Neutral[500];
        }
    };
    
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>User Management</Text>
                <Text style={styles.headerSubtitle}>{users.length} total users</Text>
            </View>
            
            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Neutral[400]} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor={Neutral[400]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                )}
            </View>
            
            {/* Filters */}
            <View style={styles.filterContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    {ROLE_OPTIONS.map(option => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.filterChip,
                                activeFilter === option.id && styles.filterChipActive
                            ]}
                            onPress={() => setActiveFilter(option.id)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                activeFilter === option.id && styles.filterChipTextActive
                            ]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            
            {filteredUsers.length === 0 ? (
                <EmptyState 
                    icon="people-outline"
                    title="No users found"
                    description="Try adjusting your search or filters."
                />
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <Card elevation={2} style={styles.userCard}>
                            <View style={styles.userHeader}>
                                <View style={styles.userInfo}>
                                    <Avatar 
                                        uri={item.avatar} 
                                        name={item.name} 
                                        size={48} 
                                    />
                                    <View style={styles.userDetails}>
                                        <View style={styles.nameRow}>
                                            <Text style={styles.userName}>{item.name}</Text>
                                            {item.status === 'suspended' && (
                                                <View style={styles.suspendedBadge}>
                                                    <Text style={styles.suspendedText}>Suspended</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.userEmail}>{item.email}</Text>
                                        <Text style={styles.joinedDate}>Joined {formatDate(item.joinedAt)}</Text>
                                    </View>
                                </View>
                            </View>
                            
                            <View style={styles.userActions}>
                                <TouchableOpacity 
                                    style={[
                                        styles.roleBadge,
                                        { backgroundColor: getRoleColor(item.role) + '20' }
                                    ]}
                                    onPress={() => handleChangeRole(item.id, item.role)}
                                >
                                    <Text style={[
                                        styles.roleText,
                                        { color: getRoleColor(item.role) }
                                    ]}>
                                        {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                                    </Text>
                                    <Ionicons 
                                        name="chevron-down" 
                                        size={14} 
                                        color={getRoleColor(item.role)} 
                                    />
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[
                                        styles.statusButton,
                                        item.status === 'active' ? styles.suspendButton : styles.activateButton
                                    ]}
                                    onPress={() => handleToggleStatus(item.id, item.status)}
                                >
                                    <Ionicons 
                                        name={item.status === 'active' ? 'ban' : 'checkmark-circle'} 
                                        size={16} 
                                        color={item.status === 'active' ? '#EF4444' : '#10B981'} 
                                    />
                                    <Text style={[
                                        styles.statusButtonText,
                                        { color: item.status === 'active' ? '#EF4444' : '#10B981' }
                                    ]}>
                                        {item.status === 'active' ? 'Suspend' : 'Activate'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: Spacing.base,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Neutral[200],
        marginBottom: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontSize: Typography.size.base,
        color: Neutral[900],
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
    userCard: {
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    userInfo: {
        flexDirection: 'row',
        flex: 1,
    },
    userDetails: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    userName: {
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
        color: Neutral[900],
    },
    suspendedBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    suspendedText: {
        fontSize: Typography.size.xs,
        color: '#EF4444',
        fontWeight: Typography.weight.medium,
    },
    userEmail: {
        fontSize: Typography.size.sm,
        color: Neutral[500],
        marginTop: 2,
    },
    joinedDate: {
        fontSize: Typography.size.xs,
        color: Neutral[400],
        marginTop: 2,
    },
    userActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Neutral[100],
        paddingTop: Spacing.md,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        gap: 4,
    },
    roleText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
    },
    statusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    suspendButton: {
        backgroundColor: '#FEE2E2',
    },
    activateButton: {
        backgroundColor: '#DCFCE7',
    },
    statusButtonText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
    },
});
