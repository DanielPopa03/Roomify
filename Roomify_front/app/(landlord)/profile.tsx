import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Avatar, Button, Card, Input, ImageGalleryModal } from '@/components/ui';
import { Blue, BorderRadius, Neutral, Spacing, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// --- HELPER: Fix Image URLs (Port 8081 -> 8080) ---
const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;

    // 1. If it's already a full URL (Auth0 or Base64), use it as is
    if (path.startsWith('http') || path.startsWith('data:')) return path;

    // 2. Otherwise, it's a relative path from the DB
    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const BASE_URL = `http://${MY_IP}:8080`;

    // Ensure we don't double-slash
    return path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
};

export default function LandlordProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, dbUser, logout, getAccessToken, refreshUser } = useAuth();

    // --- STATE ---
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [photos, setPhotos] = useState<string[]>([]); // Photos List

    // Gallery Modal State
    const [isGalleryVisible, setIsGalleryVisible] = useState(false);

    const [originalData, setOriginalData] = useState({
        name: '',
        phone: '',
        email: '',
        bio: '',
        photos: [] as string[]
    });

    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalProperties: 0,
        activeListings: 0,
        totalMatches: 0
    });

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const PHONE_VALIDATION_REGEX = /^[+]?[0-9\s\-\(\)]{7,20}$/;
    const ALLOWED_PHONE_CHARS = /[0-9\s\+\-\(\)]/g;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- SYNC WITH CONTEXT ---
    useFocusEffect(
        useCallback(() => {
            refreshUser();
        }, [])
    );

    useEffect(() => {
        if (dbUser && !isEditing) {
            const data = {
                name: dbUser.firstName || user?.name || '',
                phone: dbUser.phoneNumber || '',
                email: dbUser.email || user?.email || '',
                bio: dbUser.bio || '',
                photos: [] as string[]
            };

            // Load Photos Logic
            if (dbUser.photos && dbUser.photos.length > 0) {
                data.photos = dbUser.photos;
            } else if (dbUser.picture) {
                data.photos = [dbUser.picture];
            } else if (user?.picture) {
                data.photos = [user.picture];
            }

            setFullName(data.name);
            setPhone(data.phone);
            setEmail(data.email);
            setBio(data.bio);
            setPhotos(data.photos);
            setOriginalData(data);

            // Update stats
            setStats({
                totalProperties: dbUser.stats?.totalProperties || 0,
                activeListings: dbUser.stats?.activeProperties || 0,
                totalMatches: dbUser.stats?.totalMatches || 0
            });
        }
    }, [dbUser, isEditing]);

    // --- HANDLERS ---

    const pickImage = async () => {
        // --- LIMIT CHECK: Max 7 photos ---
        if (photos.length >= 7) {
            Alert.alert("Limit Reached", "You can upload a maximum of 7 photos.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use Options to avoid crash
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
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
        if (index === 0) return;
        const newPhotos = [...photos];
        const [selected] = newPhotos.splice(index, 1);
        newPhotos.unshift(selected);
        setPhotos(newPhotos);
    };

    const handlePhoneChange = (text: string) => {
        const filteredText = text.match(ALLOWED_PHONE_CHARS)?.join('') || '';
        setPhone(filteredText);
        setPhoneError(filteredText.length > 0 && !PHONE_VALIDATION_REGEX.test(filteredText) ? "Invalid format" : null);
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (text.trim() === '') setEmailError("Email is required");
        else if (!EMAIL_REGEX.test(text)) setEmailError("Invalid email");
        else setEmailError(null);
    };

    const handleCancel = () => {
        setFullName(originalData.name);
        setPhone(originalData.phone);
        setEmail(originalData.email);
        setBio(originalData.bio);
        setPhotos(originalData.photos);
        setPhoneError(null);
        setEmailError(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
        const userId = user?.sub;
        if (!userId || phoneError || emailError || !email) return;

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
                    phoneNumber: phone,
                    email: email,
                    bio: bio,
                    photos: photos, // Send photos
                    role: 'LANDLORD'
                })
            });

            if (response.ok) {
                await refreshUser();
                setIsEditing(false);
                Alert.alert('Success', 'Landlord profile updated!');
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
            }
        } catch (error) {
            setIsSaving(false);
        }
    };

    if (!dbUser && !user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Blue[600]} />
            </View>
        );
    }

    // FIX: Apply getImageUrl to the main photo so it resolves to port 8080
    const mainPhoto = photos.length > 0 ? getImageUrl(photos[0]) : null;

    // Prepare images for the gallery modal
    const galleryImages = photos.map(p => getImageUrl(p)).filter(p => p !== null) as string[];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Blue[600]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Landlord Profile</Text>
                <TouchableOpacity onPress={isEditing ? handleCancel : () => setIsEditing(true)}>
                    <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileHeaderCard}>
                    <LinearGradient colors={[Blue[600], Blue[800]]} style={styles.gradientBackground} />
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            {/* Tap Avatar: Edit Mode -> Pick Image, View Mode -> Open Gallery */}
                            <TouchableOpacity onPress={isEditing ? pickImage : () => setIsGalleryVisible(true)}>
                                <Avatar uri={mainPhoto} name={fullName || 'Landlord'} size={90} />
                                {isEditing && (
                                    <View style={styles.editAvatarButton}>
                                        <Ionicons name="camera" size={16} color="#FFFFFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.userName}>{isEditing ? fullName : originalData.name}</Text>
                        <Text style={styles.userRole}>Verified Landlord</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.totalProperties}</Text>
                                <Text style={styles.statLabel}>Properties</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.activeListings}</Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.totalMatches}</Text>
                                <Text style={styles.statLabel}>Matches</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* --- FIX: Gallery Section Always Visible --- */}
                {photos.length > 0 && (
                    <View style={styles.gallerySection}>
                        <Text style={styles.sectionTitle}>
                            {isEditing ? "Manage Photos (Tap to set Main)" : "My Photos"}
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
                                    // Tap: Edit -> Make Main; View -> Open Gallery
                                    onPress={() => isEditing ? makeMain(index) : setIsGalleryVisible(true)}
                                >
                                    {/* FIX: Apply getImageUrl to gallery thumbs */}
                                    <Image source={{ uri: getImageUrl(photo) }} style={styles.photoThumb} />

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
                )}

                <Text style={styles.sectionTitle}>Account Details</Text>
                <Card shadow="sm" style={styles.infoCard}>
                    <Input
                        label="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                        editable={isEditing}
                        icon={<Ionicons name="person-outline" size={18} color={Neutral[400]} />}
                    />
                    <Input
                        label="Email"
                        value={email}
                        onChangeText={handleEmailChange}
                        editable={isEditing}
                        icon={<Ionicons name="mail-outline" size={18} color={Neutral[400]} />}
                        style={emailError ? { borderColor: '#EF4444', borderWidth: 1 } : {}}
                    />
                    <Input
                        label="Phone"
                        value={phone}
                        onChangeText={handlePhoneChange}
                        editable={isEditing}
                        icon={<Ionicons name="call-outline" size={18} color={Neutral[400]} />}
                        style={phoneError ? { borderColor: '#EF4444', borderWidth: 1 } : {}}
                    />
                    <Input
                        label="Business Bio"
                        value={bio}
                        onChangeText={setBio}
                        editable={isEditing}
                        multiline
                        numberOfLines={3}
                        icon={<Ionicons name="briefcase-outline" size={18} color={Neutral[400]} />}
                    />

                    {isEditing && (
                        <Button
                            title={isSaving ? "Saving..." : "Save Changes"}
                            onPress={handleSave}
                            disabled={isSaving || !!emailError || !!phoneError}
                            style={{ marginTop: Spacing.md }}
                        />
                    )}
                </Card>

                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Card shadow="sm" style={styles.actionsCard}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(landlord)/add-property')}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="add-circle-outline" size={22} color={Blue[600]} />
                            <Text style={styles.actionText}>Add New Property</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.replace('/')}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="swap-horizontal-outline" size={22} color={Blue[600]} />
                            <Text style={styles.actionText}>Switch to Tenant Mode</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Neutral[400]} />
                    </TouchableOpacity>
                </Card>

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                    <Text style={styles.deleteButtonText}>Delete Business Account</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Roomify Landlord v1.0.0</Text>
            </ScrollView>

            {/* FULL SCREEN GALLERY MODAL */}
            <ImageGalleryModal
                visible={isGalleryVisible}
                images={galleryImages}
                onClose={() => setIsGalleryVisible(false)}
            />
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
    userName: { marginTop: Spacing.md, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Neutral[900] },
    userRole: { fontSize: Typography.size.sm, color: Blue[600], fontWeight: Typography.weight.medium, marginTop: 2 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, backgroundColor: '#FFFFFF', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.sm },
    statItem: { flex: 1, alignItems: 'center', minWidth: 80 },
    statNumber: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Blue[800] },
    statLabel: { fontSize: Typography.size.xs, color: Neutral[500] },
    statDivider: { width: 1, height: 30, backgroundColor: Neutral[200] },
    infoCard: { padding: Spacing.lg, marginHorizontal: Spacing.base, marginBottom: Spacing.lg },
    sectionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.lg },

    // Gallery Styles
    gallerySection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
    photoList: { flexDirection: 'row' },
    addPhotoButton: { width: 70, height: 70, borderRadius: 12, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: Blue[200], borderStyle: 'dashed' },
    photoThumbWrapper: { width: 70, height: 70, borderRadius: 12, marginRight: 10, position: 'relative' },
    photoThumb: { width: '100%', height: '100%', borderRadius: 12 },
    mainPhotoBorder: { borderWidth: 3, borderColor: Blue[500] },
    deletePhotoBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    mainLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingVertical: 2, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
    mainLabelText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },

    actionsCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, overflow: 'hidden' },
    actionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    actionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    actionText: { fontSize: Typography.size.base, color: Neutral[800] },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginTop: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#FEE2E2' },
    logoutText: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: '#EF4444' },
    deleteButton: { alignItems: 'center', marginTop: Spacing.lg, padding: Spacing.sm },
    deleteButtonText: { color: Neutral[400], textDecorationLine: 'underline', fontSize: 12 },
    version: { textAlign: 'center', fontSize: Typography.size.sm, color: Neutral[400], marginTop: Spacing.sm }
});