import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Input } from '@/components/ui';
import { Blue, BorderRadius, Neutral, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { InterviewApi } from '@/services/api';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, dbUser, logout, getAccessToken, refreshUser } = useAuth();

    // --- STATE ---
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [smokerFriendly, setSmokerFriendly] = useState(false);
    const [petFriendly, setPetFriendly] = useState(false);
    const [isVideoPublic, setIsVideoPublic] = useState(true);

    const [originalData, setOriginalData] = useState({
        name: '',
        bio: '',
        phone: '',
        email: '',
        jobTitle: '',
        smokerFriendly: false,
        petFriendly: false,
        isVideoPublic: true,
    });

    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState({ propertiesViewed: 0, interests: 0, matches: 0 });
    const [videoModalVisible, setVideoModalVisible] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    const PHONE_VALIDATION_REGEX = /^[+]?[0-9\s\-\(\)]{7,20}$/;
    const ALLOWED_PHONE_CHARS = /[0-9\s\+\-\(\)]/g;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- SYNC WITH CONTEXT ---
    // Every time the screen is focused, pull fresh data from the DB
    useFocusEffect(
        useCallback(() => {
            refreshUser();
        }, [])
    );

    useEffect(() => {
        if (dbUser && !isEditing) {
            const data = {
                name: dbUser.firstName || user?.name || '',
                bio: dbUser.bio || '',
                phone: dbUser.phoneNumber || '',
                email: dbUser.email || user?.email || '',
                jobTitle: dbUser.jobTitle || '',
                smokerFriendly: dbUser.smokerFriendly || false,
                petFriendly: dbUser.petFriendly || false,
                isVideoPublic: dbUser.isVideoPublic ?? true,
            };
            setFullName(data.name);
            setBio(data.bio);
            setPhone(data.phone);
            setEmail(data.email);
            setJobTitle(data.jobTitle);
            setSmokerFriendly(data.smokerFriendly);
            setPetFriendly(data.petFriendly);
            setIsVideoPublic(data.isVideoPublic);
            setOriginalData(data);
        }
    }, [dbUser, isEditing]);

    // --- HANDLERS ---

    const handlePhoneChange = (text: string) => {
        const filteredText = text.match(ALLOWED_PHONE_CHARS)?.join('') || '';
        setPhone(filteredText);
        if (filteredText.length > 0 && !PHONE_VALIDATION_REGEX.test(filteredText)) {
            setPhoneError("Invalid phone format.");
        } else {
            setPhoneError(null);
        }
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (text.trim() === '') setEmailError("Email is required.");
        else if (!EMAIL_REGEX.test(text)) setEmailError("Invalid email address.");
        else setEmailError(null);
    };

    const handleCancel = () => {
        setFullName(originalData.name);
        setBio(originalData.bio);
        setPhone(originalData.phone);
        setEmail(originalData.email);
        setPhoneError(null);
        setEmailError(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
        const userId = user?.sub;
        if (!userId) return;
        if (phoneError || emailError || !email) return;

        setIsSaving(true);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: fullName,
                    bio: bio,
                    phoneNumber: phone,
                    email: email
                })
            });

            if (response.ok) {
                await refreshUser();
                setIsEditing(false);
                Alert.alert('Success', 'Profile updated successfully!');
            } else {
                Alert.alert('Error', 'Update failed.');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        const userId = user?.sub;
        if (!userId) return;

        setIsSaving(true);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await logout();
                router.replace('/login');
            } else {
                setIsSaving(false);
                console.error("Deletion failed");
            }
        } catch (error) {
            setIsSaving(false);
            console.error("Network error on delete", error);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    if (!dbUser && !user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Blue[600]} />
            </View>
        );
    }

    const isSaveDisabled = isSaving || !!phoneError || !!emailError || email.trim() === '';

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Blue[600]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>

                <TouchableOpacity
                    onPress={isEditing ? handleCancel : () => setIsEditing(true)}
                    disabled={isSaving}
                >
                    <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileHeaderCard}>
                    <LinearGradient colors={[Blue[500], Blue[600]]} style={styles.gradientBackground} />
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            <Avatar uri={user?.picture} name={fullName || 'User'} size={90} />
                            {isEditing && (
                                <TouchableOpacity style={styles.editAvatarButton}>
                                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.nameRow}>
                            <Text style={styles.userName}>{isEditing ? fullName : originalData.name || 'Guest'}</Text>
                            {/* Verified Badge */}
                            {dbUser?.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                                    <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.userEmail}>{isEditing ? email : originalData.email}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.propertiesViewed}</Text>
                                <Text style={styles.statLabel}>Viewed</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.interests}</Text>
                                <Text style={styles.statLabel}>Interests</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.matches}</Text>
                                <Text style={styles.statLabel}>Matches</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Express Profile Setup Card - Only show if not verified */}
                {!dbUser?.isVerified && (
                    <TouchableOpacity 
                        style={styles.expressProfileCard}
                        onPress={() => router.push('/(normal)/interview/record')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient 
                            colors={['#6366f1', '#8b5cf6']} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 1 }}
                            style={styles.expressProfileGradient}
                        >
                            <View style={styles.expressProfileContent}>
                                <View style={styles.expressProfileIcon}>
                                    <Ionicons name="videocam" size={28} color="#fff" />
                                </View>
                                <View style={styles.expressProfileText}>
                                    <Text style={styles.expressProfileTitle}>⚡ Express Profile Setup</Text>
                                    <Text style={styles.expressProfileSubtitle}>
                                        Too lazy to type? 🎥 Record a quick intro and let AI fill your profile!
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                <Text style={styles.sectionTitle}>Personal Information</Text>
                <Card shadow="sm" style={styles.infoCard}>
                    <Input
                        label="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                        editable={isEditing}
                        icon={<Ionicons name="person-outline" size={18} color={Neutral[400]} />}
                    />

                    <View>
                        <Input
                            label="Email"
                            value={email}
                            onChangeText={handleEmailChange}
                            placeholder="your@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={isEditing}
                            icon={<Ionicons name="mail-outline" size={18} color={Neutral[400]} />}
                            style={emailError ? { borderColor: '#EF4444', borderWidth: 1 } : {}}
                        />
                        {emailError && isEditing && <Text style={styles.errorText}>{emailError}</Text>}
                    </View>

                    <View>
                        <Input
                            label="Phone"
                            value={phone}
                            onChangeText={handlePhoneChange}
                            placeholder="+1 (555) 000-0000"
                            keyboardType="phone-pad"
                            editable={isEditing}
                            icon={<Ionicons name="call-outline" size={18} color={Neutral[400]} />}
                            style={phoneError ? { borderColor: '#EF4444', borderWidth: 1 } : {}}
                        />
                        {phoneError && isEditing && <Text style={styles.errorText}>{phoneError}</Text>}
                    </View>

                    <Input
                        label="About Me"
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Tell landlords about yourself..."
                        multiline
                        numberOfLines={3}
                        editable={isEditing}
                        icon={<Ionicons name="document-text-outline" size={18} color={Neutral[400]} />}
                    />

                    {isEditing && (
                        <Button
                            title={isSaving ? "Saving..." : "Save Changes"}
                            onPress={handleSave}
                            disabled={isSaveDisabled}
                            style={{
                                marginTop: Spacing.md,
                                backgroundColor: isSaveDisabled ? Neutral[300] : Blue[600],
                            }}
                        />
                    )}
                </Card>

                {/* Professional Info Section */}
                <Text style={styles.sectionTitle}>Professional Info</Text>
                <View style={styles.infoCard}>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Job Title</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="briefcase-outline" size={18} color={Neutral[400]} style={styles.inputIcon} />
                            <Text style={[styles.inputValue, !jobTitle && styles.inputPlaceholder]}>
                                {jobTitle || 'Not specified'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Lifestyle & Preferences Section */}
                <Text style={styles.sectionTitle}>Lifestyle & Preferences</Text>
                <View style={styles.lifestyleCard}>
                    <View style={styles.lifestyleRow}>
                        <View style={styles.lifestyleItem}>
                            <View style={[styles.lifestyleBadge, dbUser?.smokerFriendly === true ? styles.badgeActive : styles.badgeInactive]}>
                                <Text style={styles.lifestyleEmoji}>{dbUser?.smokerFriendly === true ? '🚬' : '🚭'}</Text>
                            </View>
                            <Text style={styles.lifestyleLabel}>
                                {dbUser?.smokerFriendly === true ? 'Smoker Friendly' : 'Non-Smoking'}
                            </Text>
                        </View>
                        
                        <View style={styles.lifestyleItem}>
                            <View style={[styles.lifestyleBadge, dbUser?.petFriendly === true ? styles.badgeActive : styles.badgeInactive]}>
                                <Text style={styles.lifestyleEmoji}>{dbUser?.petFriendly === true ? '🐾' : '🚫'}</Text>
                            </View>
                            <Text style={styles.lifestyleLabel}>
                                {dbUser?.petFriendly === true ? 'Pet Friendly' : 'No Pets'}
                            </Text>
                        </View>
                    </View>
                    
                    {!dbUser?.isVerified && (
                        <Text style={styles.lifestyleHint}>
                            Complete Express Profile to update lifestyle preferences
                        </Text>
                    )}
                </View>

                {/* My Video Intro Section - Only show if user has a video */}
                {dbUser?.videoUrl && (
                    <>
                        <Text style={styles.sectionTitle}>My Video Intro</Text>
                        <View style={styles.videoCard}>
                            {/* Touchable area - only this opens the modal */}
                            <TouchableOpacity 
                                style={styles.videoPreviewRow}
                                onPress={() => setVideoModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.videoThumbnail}>
                                    <Ionicons name="play-circle" size={40} color={Blue[600]} />
                                </View>
                                <View style={styles.videoTextContainer}>
                                    <Text style={styles.videoTitle}>Video Introduction</Text>
                                    <Text style={styles.videoSubtitle}>Tap to watch • Recorded via Express Profile</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                            </TouchableOpacity>
                            
                            {/* Privacy Toggle - Simple Button */}
                            <View style={styles.videoToggleRow}>
                                <View style={styles.videoToggleInfo}>
                                    <Text style={styles.videoToggleLabel}>{isVideoPublic ? '🔓 Public' : '🔒 Private'}</Text>
                                    <Text style={styles.videoToggleHint}>{isVideoPublic ? 'Landlords can view your video' : 'Only you can see your video'}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        const newValue = !isVideoPublic;
                                        console.log('Toggling privacy from', isVideoPublic, 'to', newValue);
                                        setIsVideoPublic(newValue);
                                        
                                        getAccessToken().then(token => {
                                            fetch(`http://${MY_IP}:8080/user/${user?.sub}`, {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({ isVideoPublic: newValue })
                                            }).then(res => {
                                                console.log('API response:', res.status);
                                                if (!res.ok) {
                                                    console.error('Failed to save, reverting');
                                                    setIsVideoPublic(!newValue);
                                                }
                                                // Don't call refreshUser() - it resets the state!
                                            }).catch((err) => {
                                                console.error('Network error:', err);
                                                setIsVideoPublic(!newValue);
                                            });
                                        });
                                    }}
                                    style={[
                                        styles.privacyButton,
                                        isVideoPublic ? styles.privacyButtonPublic : styles.privacyButtonPrivate
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.privacyButtonText}>
                                        {isVideoPublic ? 'Make Private' : 'Make Public'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}

                {/* Video Player Modal */}
                <Modal
                    visible={videoModalVisible}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setVideoModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity 
                                style={styles.modalCloseButton}
                                onPress={() => setVideoModalVisible(false)}
                            >
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>My Video Intro</Text>
                            <View style={{ width: 44 }} />
                        </View>

                        <View style={styles.modalVideoContainer}>
                            {Platform.OS === 'web' ? (
                                <video
                                    src={InterviewApi.getVideoUrl(dbUser?.videoUrl || '')}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' } as any}
                                    controls
                                    autoPlay
                                />
                            ) : (
                                <View style={styles.videoPlaceholder}>
                                    <Ionicons name="play-circle" size={80} color="#fff" />
                                    <Text style={styles.videoPlaceholderText}>Video Player</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.retakeButton}
                                onPress={() => {
                                    setVideoModalVisible(false);
                                    router.push('/(normal)/interview/record');
                                }}
                            >
                                <Ionicons name="refresh" size={20} color="#fff" />
                                <Text style={styles.retakeButtonText}>Retake Video</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteAccount}
                    disabled={isSaving}
                >
                    <Text style={styles.deleteButtonText}>
                        {isSaving ? "Processing..." : "Delete Account"}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.version}>Roomify v1.0.0</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Neutral[50] },
    centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    backButton: { padding: Spacing.xs },
    headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Neutral[900] },
    editButton: { fontSize: Typography.size.base, color: Blue[600], fontWeight: Typography.weight.medium },
    content: { flex: 1 },
    scrollContent: { paddingBottom: Spacing.xl * 2 },
    profileHeaderCard: { position: 'relative', marginBottom: Spacing.lg },
    gradientBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
    avatarSection: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md },
    avatarWrapper: { position: 'relative' },
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Blue[600], width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: 8 },
    userName: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Neutral[900] },
    userEmail: { fontSize: Typography.size.sm, color: Neutral[500], marginTop: 2 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    verifiedText: { fontSize: 12, fontWeight: '600', color: '#22c55e' },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, backgroundColor: '#FFFFFF', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Blue[600] },
    statLabel: { fontSize: Typography.size.xs, color: Neutral[500], marginTop: 2 },
    statDivider: { width: 1, height: 30, backgroundColor: Neutral[200] },
    // Express Profile Card Styles
    expressProfileCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, borderRadius: 16, overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    expressProfileGradient: { padding: Spacing.md },
    expressProfileContent: { flexDirection: 'row', alignItems: 'center' },
    expressProfileIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    expressProfileText: { flex: 1 },
    expressProfileTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
    expressProfileSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
    // Info Card & Input Styles
    infoCard: { padding: Spacing.lg, marginHorizontal: Spacing.base, marginBottom: Spacing.lg, backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    sectionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.lg },
    inputWrapper: { marginBottom: Spacing.sm },
    inputLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.medium, color: Neutral[500], marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    inputIcon: { marginRight: Spacing.sm },
    inputValue: { fontSize: Typography.size.base, color: Neutral[900], flex: 1 },
    inputPlaceholder: { color: Neutral[400] },
    // Lifestyle Section Styles
    lifestyleCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, padding: Spacing.md, backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    lifestyleRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    lifestyleItem: { alignItems: 'center', flex: 1 },
    lifestyleBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    badgeActive: { backgroundColor: Blue[50], borderWidth: 2, borderColor: Blue[200] },
    badgeInactive: { backgroundColor: Neutral[100], borderWidth: 2, borderColor: Neutral[200] },
    lifestyleEmoji: { fontSize: 24 },
    lifestyleLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.medium, color: Neutral[700], textAlign: 'center' },
    lifestyleHint: { fontSize: Typography.size.xs, color: Neutral[400], textAlign: 'center', marginTop: Spacing.md, fontStyle: 'italic' },
    // Video Section Styles
    videoCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, padding: Spacing.md, backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    videoPreviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    videoThumbnail: { width: 64, height: 64, borderRadius: BorderRadius.md, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    videoTextContainer: { flex: 1 },
    videoTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Neutral[900] },
    videoSubtitle: { fontSize: Typography.size.xs, color: Neutral[500], marginTop: 2 },
    videoToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Neutral[100] },
    videoToggleInfo: { flex: 1 },
    videoToggleLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: Neutral[900] },
    videoToggleHint: { fontSize: Typography.size.xs, color: Neutral[500], marginTop: 2 },
    // Privacy Button Styles
    privacyButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    privacyButtonPublic: { backgroundColor: '#fee2e2' },
    privacyButtonPrivate: { backgroundColor: '#dcfce7' },
    privacyButtonText: { fontSize: 13, fontWeight: '600', color: Neutral[800] },
    // Footer Buttons
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginTop: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#FEE2E2' },
    logoutText: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: '#EF4444' },
    deleteButton: { alignItems: 'center', marginTop: Spacing.md, padding: Spacing.sm },
    deleteButtonText: { color: Neutral[400], textDecorationLine: 'underline', fontSize: 12 },
    version: { textAlign: 'center', fontSize: Typography.size.sm, color: Neutral[400], marginTop: Spacing.lg },
    errorText: { color: '#EF4444', fontSize: Typography.size.xs, marginTop: 4, marginLeft: 4 },
    // Video Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#000' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg, paddingTop: 50 },
    modalCloseButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { color: '#fff', fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold },
    modalVideoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    videoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    videoPlaceholderText: { color: '#fff', marginTop: Spacing.md, fontSize: Typography.size.base },
    modalActions: { padding: Spacing.lg, paddingBottom: 40 },
    retakeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: '#EF4444', paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
    retakeButtonText: { color: '#fff', fontSize: Typography.size.base, fontWeight: Typography.weight.semibold }
});