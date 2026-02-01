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
    Dimensions,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';

import { Blue, BorderRadius, Neutral, Spacing, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { UsersApi, InterviewApi, PublicUserProfile } from '@/services/api';
import { SafeImage } from '@/components/ui';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PublicUserProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id, matchId } = useLocalSearchParams<{ id: string; matchId?: string }>();
    const { user, getAccessToken } = useAuth();
    
    const [profile, setProfile] = useState<PublicUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [matchInfo, setMatchInfo] = useState<any | null>(null);

    useEffect(() => {
        if (!id || typeof id !== 'string') return;
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const token = await getAccessToken();
                const response = await UsersApi.getById(token!, id);
                if (response.data) {
                    setProfile(response.data);
                } else {
                    console.error('Error fetching profile:', response.error);
                    Alert.alert('Error', 'Failed to load profile');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                Alert.alert('Error', 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    useEffect(() => {
        if (!profile || !profile.videoUrl || !profile.isVideoPublic) {
            setVideoUrl(null);
            return;
        }
        const fullUrl = InterviewApi.getVideoUrl(profile.videoUrl);
        setVideoUrl(fullUrl);
    }, [profile]);

    // If we have a matchId (navigated from chat), poll match info and refresh profile when it changes
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        const lastInfoRef = { current: null as any };
        if (!matchId || typeof matchId !== 'string') return;

        const poll = async () => {
            try {
                const token = await getAccessToken();
                const res = await fetch(`http://${process.env.EXPO_PUBLIC_BACKEND_IP || 'localhost'}:8080/api/chats/${matchId}/info`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;
                const info = await res.json();
                // Compare to last seen info to avoid repeated refreshes
                const prev = lastInfoRef.current;
                const shouldRefresh = !prev || info?.tenantMessaged !== prev?.tenantMessaged || info?.timeLeftSeconds !== prev?.timeLeftSeconds;
                if (shouldRefresh) {
                    lastInfoRef.current = info;
                    setMatchInfo(info);
                    const token2 = await getAccessToken();
                    const r = await UsersApi.getById(token2!, id as string);
                    if (r.data) setProfile(r.data);
                }
            } catch (e) {
                // ignore
            }
        };

        interval = setInterval(poll, 3000);
        poll();

        return () => { if (interval) clearInterval(interval); };
    }, [matchId, getAccessToken, id]);

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Blue[600]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Blue[600]} />
                </View>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Blue[600]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>User not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Blue[600]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
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
                <View style={styles.section}>
                    <View style={styles.avatarContainer}>
                        <SafeImage 
                            source={{ 
                                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.firstName || 'U')}&size=200&background=0284C7&color=fff`
                            }}
                            style={styles.avatar}
                        />
                    </View>
                    <Text style={styles.name}>{profile.firstName || 'User'}</Text>
                    {profile.jobTitle && (
                        <View style={styles.jobContainer}>
                            <Ionicons name="briefcase-outline" size={16} color={Neutral[600]} />
                            <Text style={styles.jobTitle}>{profile.jobTitle}</Text>
                        </View>
                    )}

                    {/* If opened from a chat (matchId present) we show a simplified contact-focused view */}
                    {matchId && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contact</Text>
                            {profile.email && <Text style={styles.contactText}>Email: {profile.email}</Text>}
                            {profile.phoneNumber && <Text style={styles.contactText}>Phone: {profile.phoneNumber}</Text>}
                        </View>
                    )}
                </View>

                {profile.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.bioText}>{profile.bio}</Text>
                    </View>
                )}

                {/* Hide lifestyle and video when opened from chat (we only show contact + bio in that context) */}
                {!matchId && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Lifestyle Preferences</Text>
                        <LifestyleBadges 
                            smokerFriendly={profile.isSmoker} 
                            petFriendly={profile.hasPets} 
                        />
                    </View>
                )}

                {!matchId && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Video Introduction</Text>
                        {!profile.videoUrl ? (
                            <View style={styles.videoPlaceholder}>
                                <Ionicons name="videocam-off-outline" size={48} color={Neutral[400]} />
                                <Text style={styles.placeholderText}>No video introduction available</Text>
                            </View>
                        ) : profile.isVideoPublic === true && videoUrl ? (
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
                            <View style={styles.lockedVideoCard}>
                                <View style={styles.lockIconContainer}>
                                    <Ionicons name="lock-closed" size={32} color="#fff" />
                                </View>
                                <Text style={styles.lockedTitle}>Private Video</Text>
                                <Text style={styles.lockedSubtext}>
                                    This user has chosen to keep their video introduction private.
                                </Text>
                            </View>
                        )}
                    </View>
                )}
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
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: Typography.size.lg, fontWeight: '600', color: Neutral[900] },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: Typography.size.base, color: Neutral[600] },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg },
    section: { marginTop: Spacing.xl, backgroundColor: '#fff', borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.sm },
    avatarContainer: { alignItems: 'center', marginBottom: Spacing.lg },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: Neutral[200] },
    name: { fontSize: Typography.size['2xl'], fontWeight: '700', color: Neutral[900], textAlign: 'center', marginBottom: Spacing.sm },
    jobContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
    jobTitle: { fontSize: Typography.size.base, color: Neutral[600] },
    sectionTitle: { fontSize: Typography.size.lg, fontWeight: '600', color: Neutral[900], marginBottom: Spacing.md },
    bioText: { fontSize: Typography.size.base, color: Neutral[700], lineHeight: 24 },
    videoContainer: { width: '100%', aspectRatio: 16 / 9, borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#000', marginTop: Spacing.md, ...Shadows.sm },
    video: { width: '100%', height: '100%' },
    videoPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['2xl'], backgroundColor: Neutral[100], borderRadius: BorderRadius.md, gap: Spacing.md },
    placeholderText: { fontSize: Typography.size.base, fontWeight: '500', color: Neutral[700], textAlign: 'center' },
    lockedVideoCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['2xl'], paddingHorizontal: Spacing.lg, backgroundColor: Neutral[200], borderRadius: BorderRadius.lg, borderWidth: 2, borderColor: Neutral[300], borderStyle: 'dashed', gap: Spacing.md },
    lockIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: Neutral[400], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
    lockedTitle: { fontSize: Typography.size.base, fontWeight: '700', color: Neutral[900], marginBottom: Spacing.xs },
    lockedSubtext: { fontSize: Typography.size.sm, color: Neutral[600], textAlign: 'center' },

    // Seriousness
    seriousnessContainer: { marginTop: Spacing.md, alignItems: 'center' },
    seriousnessLabel: { fontSize: Typography.size.xs, color: Neutral[500], marginBottom: Spacing.xs },
    seriousnessBadge: { minWidth: 48, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    seriousnessText: { color: '#fff', fontWeight: '700' },
    positive: { backgroundColor: '#059669' },
    negative: { backgroundColor: '#B91C1C' },
    neutral: { backgroundColor: '#6B7280' },
    contactText: { fontSize: Typography.size.base, color: Neutral[700], marginTop: Spacing.xs },
});