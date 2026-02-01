import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    StyleSheet, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert,
    Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';

import { SafeImage, LifestyleBadges } from '@/components/ui';

// --- Helper: Seriousness colorization ---
const hexToRgb = (hex: string) => {
    const clean = hex.replace('#','');
    const bigint = parseInt(clean, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};
const rgbToHex = (r:number,g:number,b:number) => {
    const toHex = (x:number) => ('0' + x.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
const interpolateColor = (a:string, b:string, t:number) => {
    const A = hexToRgb(a); const B = hexToRgb(b);
    const r = Math.round(A.r + (B.r - A.r) * t);
    const g = Math.round(A.g + (B.g - A.g) * t);
    const bl = Math.round(A.b + (B.b - A.b) * t);
    return rgbToHex(r,g,bl);
};

const seriousnessColor = (score?: number) => {
    if (score == null) return '#6B7280';
    if (score === 0) return '#6B7280';
    const mag = Math.min(Math.abs(score), 10) / 10; // normalize
    if (score > 0) return interpolateColor('#D1FAE5', '#059669', mag);
    return interpolateColor('#FEE2E2', '#B91C1C', mag);
};

const seriousnessTextColor = (score?: number) => {
    const bg = seriousnessColor(score);
    const { r, g, b } = hexToRgb(bg);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000' : '#fff';
};
import { Blue, BorderRadius, Neutral, Spacing, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { UsersApi, InterviewApi, ConversationsApi, PublicUserProfile } from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TenantProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id, matchId } = useLocalSearchParams<{ id: string; matchId?: string }>();
    const { user, getAccessToken } = useAuth();
    
    const [tenant, setTenant] = useState<PublicUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // Fetch tenant details
    useEffect(() => {
        let interval: any;
        if (!id || typeof id !== 'string') return;
        
        const fetchTenant = async () => {
            try {
                setLoading(true);
                const token = await getAccessToken();
                const response = await UsersApi.getById(token!, id);
                if (response.data) {
                    setTenant(response.data);
                } else {
                    console.error('Error fetching tenant:', response.error);
                    Alert.alert('Error', 'Failed to load tenant profile');
                }
            } catch (error) {
                console.error('Error fetching tenant:', error);
                Alert.alert('Error', 'Failed to load tenant profile');
            } finally {
                setLoading(false);
            }
        };

        fetchTenant();
    }, [id]);

    // Set video URL if video is public
    useEffect(() => {
        if (!tenant || !tenant.videoUrl || !tenant.isVideoPublic) {
            setVideoUrl(null);
            return;
        }
        
        // Use InterviewApi helper to build the full URL
        const fullUrl = InterviewApi.getVideoUrl(tenant.videoUrl);
        setVideoUrl(fullUrl);
    }, [tenant]);

    const handleRequestVideo = async () => {
        if (!matchId) {
            Alert.alert('Error', 'Cannot send message - no chat found');
            return;
        }
        
        try {
            const token = await getAccessToken();
            const message = tenant?.videoUrl 
                ? "Hi! I'd like to view your video introduction. Could you please make it public?"
                : "Hi! Would you be able to record a video introduction so I can learn more about you?";
            
            const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
            
            // Send the message using the matchId we already have
            const response = await fetch(`http://${MY_IP}:8080/api/chats/${matchId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: message })
            });
            
            if (response.ok) {
                Alert.alert(
                    'Request Sent',
                    tenant?.videoUrl 
                        ? 'Your request to view the video has been sent.'
                        : 'Your request for a video introduction has been sent.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Error', 'Failed to send request');
            }
        } catch (error) {
            console.error('Error sending request:', error);
            Alert.alert('Error', 'Failed to send request');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Blue[600]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tenant Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Blue[600]} />
                </View>
            </View>
        );
    }

    if (!tenant) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Blue[600]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tenant Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Tenant not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Blue[600]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tenant Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + Spacing.xl }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar & Basic Info */}
                <View style={styles.section}>
                    <View style={styles.avatarContainer}>
                        <SafeImage 
                            source={{ 
                                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(tenant.firstName || 'T')}&size=200&background=0284C7&color=fff`
                            }}
                            style={styles.avatar}
                        />
                    </View>
                    
                    <Text style={styles.name}>
                        {tenant.firstName && tenant.firstName.trim() !== '' 
                            ? tenant.firstName 
                            : 'Tenant'}
                    </Text>
                    
                    {tenant.jobTitle && tenant.jobTitle.trim() !== '' && (
                        <View style={styles.jobContainer}>
                            <Ionicons name="briefcase-outline" size={16} color={Neutral[600]} />
                            <Text style={styles.jobTitle}>{tenant.jobTitle}</Text>
                        </View>
                    )}

                    {typeof tenant.seriousnessScore !== 'undefined' && (
                        <View style={styles.seriousnessContainer}>
                            <Text style={styles.seriousnessLabel}>Seriousness</Text>
                            <View style={[styles.seriousnessBadge, { backgroundColor: seriousnessColor(tenant.seriousnessScore) }]}>
                                <Text style={[styles.seriousnessText, { color: seriousnessTextColor(tenant.seriousnessScore) }]}>{tenant.seriousnessScore}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Bio Section */}
                {tenant.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.bioText}>{tenant.bio}</Text>
                    </View>
                )}

                {/* Lifestyle Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lifestyle Preferences</Text>
                    <LifestyleBadges 
                        smokerFriendly={tenant.isSmoker} 
                        petFriendly={tenant.hasPets} 
                    />
                </View>

                {/* Video Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Video Introduction</Text>
                    
                    {!tenant.videoUrl ? (
                        // No video uploaded yet
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="videocam-off-outline" size={48} color={Neutral[400]} />
                            <Text style={styles.placeholderText}>No video introduction available</Text>
                            <TouchableOpacity 
                                style={styles.requestButton}
                                onPress={handleRequestVideo}
                            >
                                <Ionicons name="mail-outline" size={20} color={Blue[600]} />
                                <Text style={styles.requestButtonText}>Request Video</Text>
                            </TouchableOpacity>
                        </View>
                    ) : tenant.isVideoPublic === true && videoUrl ? (
                        // Video is public and available
                        <View style={styles.videoContainer}>
                            <Video
                                source={{ uri: videoUrl }}
                                style={styles.video}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping={false}
                            />
                        </View>
                    ) : (
                        // Video exists but is private - distinct locked card
                        <View style={styles.lockedVideoCard}>
                            <View style={styles.lockIconContainer}>
                                <Ionicons name="lock-closed" size={32} color="#fff" />
                            </View>
                            <Text style={styles.lockedTitle}>Private Video</Text>
                            <Text style={styles.lockedSubtext}>
                                This tenant has chosen to keep their video introduction private.
                                Send a request to ask for access.
                            </Text>
                            <TouchableOpacity 
                                style={styles.requestAccessButton}
                                onPress={handleRequestVideo}
                            >
                                <Ionicons name="key-outline" size={20} color="#fff" />
                                <Text style={styles.requestAccessText}>Request Access</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Neutral[200],
        ...Shadows.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.size.lg,
        fontWeight: '600',
        color: Neutral[900],
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: Typography.size.base,
        color: Neutral[600],
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
    },
    section: {
        marginTop: Spacing.xl,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Neutral[200],
    },
    name: {
        fontSize: Typography.size['2xl'],
        fontWeight: '700',
        color: Neutral[900],
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    jobContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    jobTitle: {
        fontSize: Typography.size.base,
        color: Neutral[600],
    },
    bio: {
        fontSize: Typography.size.base,
        color: Neutral[700],
        lineHeight: 22,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: Typography.size.lg,
        fontWeight: '600',
        color: Neutral[900],
        marginBottom: Spacing.md,
    },
    bioText: {
        fontSize: Typography.size.base,
        color: Neutral[700],
        lineHeight: 24,
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        backgroundColor: '#000',
        marginTop: Spacing.md,
        ...Shadows.sm,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing['2xl'],
        backgroundColor: Neutral[100],
        borderRadius: BorderRadius.md,
        gap: Spacing.md,
    },

    // Seriousness
    seriousnessContainer: {
        marginTop: Spacing.md,
        alignItems: 'center',
    },
    seriousnessLabel: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginBottom: Spacing.xs,
    },
    seriousnessBadge: {
        minWidth: 48,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seriousnessText: {
        color: '#fff',
        fontWeight: '700',
    },
    positive: { backgroundColor: '#059669' },
    negative: { backgroundColor: '#B91C1C' },
    neutral: { backgroundColor: '#6B7280' },
    placeholderText: {
        fontSize: Typography.size.base,
        fontWeight: '500',
        color: Neutral[700],
        textAlign: 'center',
    },
    placeholderSubtext: {
        fontSize: Typography.size.sm,
        color: Neutral[600],
        textAlign: 'center',
        paddingHorizontal: Spacing.xl,
    },
    // Locked video card - distinct gray styling
    lockedVideoCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing.lg,
        backgroundColor: Neutral[200],
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Neutral[300],
        borderStyle: 'dashed',
        gap: Spacing.md,
    },
    lockIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Neutral[500],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    lockedTitle: {
        fontSize: Typography.size.lg,
        fontWeight: '600',
        color: Neutral[700],
    },
    lockedSubtext: {
        fontSize: Typography.size.sm,
        color: Neutral[600],
        textAlign: 'center',
        lineHeight: 20,
    },
    requestAccessButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Neutral[600],
        borderRadius: BorderRadius.full,
        marginTop: Spacing.md,
    },
    requestAccessText: {
        fontSize: Typography.size.base,
        fontWeight: '600',
        color: '#fff',
    },
    requestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Blue[50],
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    requestButtonText: {
        fontSize: Typography.size.base,
        fontWeight: '600',
        color: Blue[600],
    },
});
