import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform, Modal, Image, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Avatar, Button, Card, Input, ImageGalleryModal } from '@/components/ui';
import { Blue, BorderRadius, Neutral, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { InterviewApi } from '@/services/api';

// --- HELPER: Fix Image URLs ---
const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const BASE_URL = `http://${MY_IP}:8080`;
    return path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
};

const TENANT_TYPES = [
    { label: 'Student', value: 'STUDENT' },
    { label: 'Professional', value: 'PROFESSIONAL' },
    { label: 'Family', value: 'FAMILY' },
    { label: 'Couple', value: 'COUPLE' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, dbUser, logout, getAccessToken, refreshUser } = useAuth();

    // --- STATE ---
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [isSmoker, setIsSmoker] = useState(false);
    const [hasPets, setHasPets] = useState(false);
    const [isVideoPublic, setIsVideoPublic] = useState(true);

    const [originalData, setOriginalData] = useState({
        name: '',
        bio: '',
        phone: '',
        email: '',
        jobTitle: '',
        isSmoker: false,
        hasPets: false,
        isVideoPublic: true,
    });
    const [photos, setPhotos] = useState<string[]>([]);

    // PREFERENCES
    const [minRooms, setMinRooms] = useState(1);
    const [wantsExtraBath, setWantsExtraBath] = useState(false);
    const [tenantType, setTenantType] = useState('STUDENT');

    // Active Lease (Verified Resident)
    const [activeLeaseProperty, setActiveLeaseProperty] = useState<string | null>(null);

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [videoModalVisible, setVideoModalVisible] = useState(false);
    const [isGalleryVisible, setIsGalleryVisible] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    // Fetch active lease property when component mounts or user changes
    useEffect(() => {
        const fetchActiveLeaseProperty = async () => {
            if (!user?.sub) return;
            try {
                const token = await getAccessToken();
                const encodedUserId = encodeURIComponent(user.sub);
                const response = await fetch(`http://${MY_IP}:8080/user/${encodedUserId}/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setActiveLeaseProperty(data.activeLeaseProperty);
                }
            } catch (error) {
                console.error('Error fetching active lease:', error);
            }
        };
        fetchActiveLeaseProperty();
    }, [user?.sub, getAccessToken]);

    useFocusEffect(useCallback(() => { refreshUser(); }, []));

    useEffect(() => {
        if (dbUser && !isEditing) {
            const data = {
                name: dbUser.firstName || user?.name || '',
                bio: dbUser.bio || '',
                phone: dbUser.phoneNumber || '',
                email: dbUser.email || user?.email || '',
                jobTitle: dbUser.jobTitle || '',
                isSmoker: dbUser.isSmoker || false,
                hasPets: dbUser.hasPets || false,
                isVideoPublic: dbUser.isVideoPublic ?? true,
            };
            setFullName(data.name);
            setBio(data.bio);
            setPhone(data.phone);
            setEmail(data.email);
            setJobTitle(data.jobTitle);
            setIsSmoker(data.isSmoker);
            setHasPets(data.hasPets);
            setIsVideoPublic(data.isVideoPublic);
            setOriginalData(data);
            setMinRooms(dbUser.minRooms || 1);
            setWantsExtraBath(dbUser.wantsExtraBathroom || false);
            setTenantType(dbUser.tenantType || 'STUDENT');

            if (dbUser.photos && dbUser.photos.length > 0) {
                setPhotos(dbUser.photos);
            } else if (dbUser.picture) {
                setPhotos([dbUser.picture]);
            } else if (user?.picture) {
                setPhotos([user.picture]);
            }
        }
    }, [dbUser, isEditing]);

    // --- PHOTO HANDLERS (Added Reorder/Delete Logic) ---

    const pickImage = async () => {
        if (photos.length >= 7) { Alert.alert("Limit Reached", "Max 7 photos."); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
        });
        if (!result.canceled && result.assets[0].base64) {
            const newImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setPhotos(prev => [...prev, newImage]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const makeMain = (index: number) => {
        if (index === 0) return; // Already main
        const newPhotos = [...photos];
        const [selected] = newPhotos.splice(index, 1);
        newPhotos.unshift(selected); // Move to front
        setPhotos(newPhotos);
    };

    // --- OTHER HANDLERS ---

    const handleEmailChange = (text: string) => {
        setEmail(text);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(text)) {
            setEmailError('Invalid email format');
        } else {
            setEmailError('');
        }
    };

    const handleSave = async () => {
        if (emailError) { Alert.alert('Error', 'Please fix errors before saving.'); return; }
        const userId = user?.sub;
        if (!userId) return;
        setIsSaving(true);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: fullName, bio, phoneNumber: phone, email, photos, jobTitle,
                    isSmoker, hasPets, minRooms, wantsExtraBathroom: wantsExtraBath, tenantType,
                    isVideoPublic
                })
            });
            if (response.ok) { await refreshUser(); setIsEditing(false); Alert.alert('Success', 'Profile Updated'); }
        } catch (error) { Alert.alert('Error', 'Network error.'); }
        finally { setIsSaving(false); }
    };

    const handleLogout = async () => { await logout(); router.replace('/login'); };

    if (!dbUser && !user) return <ActivityIndicator style={styles.centered} size="large" color={Blue[600]} />;

    const mainPhoto = photos.length > 0 ? getImageUrl(photos[0]) : null;
    const galleryImages = photos.map(p => getImageUrl(p)).filter(p => p !== null) as string[];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={24} color={Blue[600]} /></TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                    <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* AVATAR SECTION */}
                <View style={styles.profileHeaderCard}>
                    <LinearGradient colors={[Blue[500], Blue[600]]} style={styles.gradientBackground} />
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={isEditing ? pickImage : () => setIsGalleryVisible(true)}>
                            <Avatar uri={mainPhoto} name={fullName} size={90} />
                            {isEditing && <View style={styles.editAvatarButton}><Ionicons name="camera" size={16} color="#FFFFFF" /></View>}
                        </TouchableOpacity>
                        <View style={styles.nameRow}>
                            <Text style={styles.userNameHeader}>{fullName}</Text>
                            {dbUser?.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                                    <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.userEmailHeader}>{tenantType} • {email}</Text>
                    </View>
                </View>

                {/* VERIFIED RESIDENT BADGE */}
                {activeLeaseProperty && (
                    <View style={styles.residentBadgeCard}>
                        <View style={styles.residentBadgeContent}>
                            <Ionicons name="home" size={24} color="#22c55e" />
                            <View style={styles.residentBadgeText}>
                                <Text style={styles.residentBadgeTitle}>🏠 Verified Resident</Text>
                                <Text style={styles.residentBadgeSubtitle}>Currently living at {activeLeaseProperty}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* PHOTOS GALLERY (Updated with Delete/Reorder) */}
                <View style={styles.gallerySection}>
                    <Text style={styles.sectionTitle}>
                        {isEditing ? "Manage Photos (Tap to set Main)" : "Photos"}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                        {isEditing && (
                            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                                <Ionicons name="add" size={30} color={Blue[600]} />
                            </TouchableOpacity>
                        )}
                        {photos.map((photo, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.photoThumbWrapper, index === 0 && styles.mainPhotoBorder]}
                                onPress={() => isEditing ? makeMain(index) : setIsGalleryVisible(true)}
                            >
                                <Image source={{ uri: getImageUrl(photo) || undefined }} style={styles.photoThumb} />

                                {isEditing && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto(index)}>
                                        <Ionicons name="close" size={12} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                                {index === 0 && (
                                    <View style={styles.mainLabel}>
                                        <Text style={styles.mainLabelText}>MAIN</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* --- LIFESTYLE & PREFERENCES --- */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <Card shadow="sm" style={styles.infoCard}>
                    {/* TENANT TYPE SELECTOR */}
                    <View style={styles.prefRow}>
                        <View style={styles.prefLabelContainer}>
                            <Ionicons name="briefcase-outline" size={20} color={Neutral[600]} />
                            <Text style={styles.prefLabel}>I am a...</Text>
                        </View>
                        {isEditing ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 5, maxWidth: 200 }}>
                                {TENANT_TYPES.map((t) => (
                                    <TouchableOpacity
                                        key={t.value}
                                        style={[styles.typeChip, tenantType === t.value && styles.typeChipActive]}
                                        onPress={() => setTenantType(t.value)}
                                    >
                                        <Text style={[styles.typeChipText, tenantType === t.value && styles.typeChipTextActive]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.valueText}>{TENANT_TYPES.find(t => t.value === tenantType)?.label || tenantType}</Text>
                        )}
                    </View>

                    {/* SMOKER */}
                    <View style={styles.prefRow}>
                        <View style={styles.prefLabelContainer}><Ionicons name="flame-outline" size={20} color={Neutral[600]} /><Text style={styles.prefLabel}>Smoker</Text></View>
                        <Switch value={isSmoker} onValueChange={isEditing ? setIsSmoker : undefined} disabled={!isEditing} trackColor={{ false: Neutral[300], true: Blue[600] }} />
                    </View>

                    {/* PETS */}
                    <View style={styles.prefRow}>
                        <View style={styles.prefLabelContainer}><Ionicons name="paw-outline" size={20} color={Neutral[600]} /><Text style={styles.prefLabel}>Pets</Text></View>
                        <Switch value={hasPets} onValueChange={isEditing ? setHasPets : undefined} disabled={!isEditing} trackColor={{ false: Neutral[300], true: Blue[600] }} />
                    </View>

                    {/* ROOMS */}
                    <View style={styles.prefRow}>
                        <View style={styles.prefLabelContainer}><Ionicons name="bed-outline" size={20} color={Neutral[600]} /><Text style={styles.prefLabel}>Min. Rooms</Text></View>
                        <View style={styles.counterContainer}>
                            {isEditing && <TouchableOpacity onPress={() => setMinRooms(Math.max(1, minRooms - 1))} style={styles.counterBtn}><Ionicons name="remove" size={16} color={Blue[600]} /></TouchableOpacity>}
                            <Text style={styles.counterText}>{minRooms}</Text>
                            {isEditing && <TouchableOpacity onPress={() => setMinRooms(Math.min(5, minRooms + 1))} style={styles.counterBtn}><Ionicons name="add" size={16} color={Blue[600]} /></TouchableOpacity>}
                        </View>
                    </View>

                    {/* BATHROOMS */}
                    <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.prefLabelContainer}><Ionicons name="water-outline" size={20} color={Neutral[600]} /><Text style={styles.prefLabel}>2+ Bathrooms</Text></View>
                        <Switch value={wantsExtraBath} onValueChange={isEditing ? setWantsExtraBath : undefined} disabled={!isEditing} trackColor={{ false: Neutral[300], true: Blue[600] }} />
                    </View>
                </Card>

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

                {/* PERSONAL INFO INPUTS */}
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
                    <Input
                        label="Job Title"
                        value={jobTitle}
                        onChangeText={setJobTitle}
                        placeholder="Software Engineer"
                        editable={isEditing}
                        icon={<Ionicons name="briefcase-outline" size={18} color={Neutral[400]} />}
                    />
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

                    <Input
                        label="Phone"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+1 234 567 890"
                        editable={isEditing}
                        icon={<Ionicons name="call-outline" size={18} color={Neutral[400]} />}
                    />

                    <Input
                        label="About Me"
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                        editable={isEditing}
                        placeholder="Tell landlords a bit about yourself..."
                    />

                    {isEditing && <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={handleSave} disabled={isSaving} style={{ marginTop: Spacing.md }} />}
                </Card>

                {/* My Video Intro Section */}
                {dbUser?.videoUrl && (
                    <>
                        <Text style={styles.sectionTitle}>My Video Intro</Text>
                        <View style={styles.videoCard}>
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

                            <View style={styles.videoToggleRow}>
                                <View style={styles.videoToggleInfo}>
                                    <Text style={styles.videoToggleLabel}>{isVideoPublic ? '🔓 Public' : '🔒 Private'}</Text>
                                    <Text style={styles.videoToggleHint}>{isVideoPublic ? 'Landlords can view your video' : 'Only you can see your video'}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setIsVideoPublic(!isVideoPublic)}
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

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

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

            <ImageGalleryModal visible={isGalleryVisible} images={galleryImages} onClose={() => setIsGalleryVisible(false)} />
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
    profileHeaderCard: { position: 'relative', marginBottom: Spacing.lg },
    gradientBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
    avatarSection: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md },
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Blue[600], width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: 8 },
    userNameHeader: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Neutral[900] },
    userEmailHeader: { fontSize: Typography.size.sm, color: Neutral[500], marginTop: 2, textTransform: 'capitalize' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    verifiedText: { fontSize: 12, fontWeight: '600', color: '#22c55e' },

    // Verified Resident Badge
    residentBadgeCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, borderRadius: 16, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 2, borderColor: '#22c55e', padding: Spacing.md },
    residentBadgeContent: { flexDirection: 'row', alignItems: 'center' },
    residentBadgeText: { marginLeft: Spacing.sm, flex: 1 },
    residentBadgeTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: '#166534' },
    residentBadgeSubtitle: { fontSize: Typography.size.sm, color: '#22c55e', marginTop: 2 },

    // Express Profile Card
    expressProfileCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, borderRadius: 16, overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    expressProfileGradient: { padding: Spacing.md },
    expressProfileContent: { flexDirection: 'row', alignItems: 'center' },
    expressProfileIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    expressProfileText: { flex: 1 },
    expressProfileTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
    expressProfileSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },

    // Info Cards
    infoCard: { padding: Spacing.lg, marginHorizontal: Spacing.base, marginBottom: Spacing.lg, backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    sectionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.lg },

    // Gallery
    gallerySection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
    photoList: { flexDirection: 'row' },
    addPhotoButton: { width: 70, height: 70, borderRadius: 12, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: Blue[200], borderStyle: 'dashed' },
    photoThumbWrapper: { width: 70, height: 70, borderRadius: 12, marginRight: 10, position: 'relative' },
    photoThumb: { width: '100%', height: '100%', borderRadius: 12 },
    mainPhotoBorder: { borderWidth: 3, borderColor: Blue[500] },
    deletePhotoBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    mainLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingVertical: 2, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
    mainLabelText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },

    // Preferences
    prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    prefLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    prefLabel: { fontSize: 16, color: Neutral[800] },
    counterContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    counterBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center' },
    counterText: { fontSize: 18, fontWeight: 'bold', color: Blue[800] },
    typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: Neutral[100], borderWidth: 1, borderColor: Neutral[200] },
    typeChipActive: { backgroundColor: Blue[50], borderColor: Blue[600] },
    typeChipText: { fontSize: 10, color: Neutral[600] },
    typeChipTextActive: { color: Blue[700], fontWeight: 'bold' },
    valueText: { fontSize: 16, color: Blue[800], fontWeight: '600' },

    // Video Section
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
    privacyButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    privacyButtonPublic: { backgroundColor: '#fee2e2' },
    privacyButtonPrivate: { backgroundColor: '#dcfce7' },
    privacyButtonText: { fontSize: 13, fontWeight: '600', color: Neutral[800] },

    // Logout
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginTop: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#FEE2E2' },
    logoutText: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: '#EF4444' },

    // Errors
    errorText: { color: '#EF4444', fontSize: Typography.size.xs, marginTop: 4, marginLeft: 4 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#000' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg, paddingTop: 50 },
    modalCloseButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { color: '#fff', fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold },
    modalVideoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    videoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    videoPlaceholderText: { color: '#fff', marginTop: Spacing.md, fontSize: Typography.size.base },
    modalActions: { padding: Spacing.lg, paddingBottom: 40 },
    retakeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: '#EF4444', paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
    retakeButtonText: { color: '#fff', fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
});