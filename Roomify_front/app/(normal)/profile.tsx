import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

// FIX: Import ImageGalleryModal
import { Avatar, Button, Card, Input, ImageGalleryModal } from '@/components/ui';
import { Blue, BorderRadius, Neutral, Spacing, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// --- HELPER: Fix Image URLs ---
const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const BASE_URL = `http://${MY_IP}:8080`;
    return path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
};

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, dbUser, logout, getAccessToken, refreshUser } = useAuth();

    // --- STATE ---
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);

    // Gallery Modal
    const [isGalleryVisible, setIsGalleryVisible] = useState(false);

    const [originalData, setOriginalData] = useState({
        name: '', bio: '', phone: '', email: '', photos: [] as string[]
    });

    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState({ propertiesViewed: 0, interests: 0, matches: 0 });

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
    const PHONE_VALIDATION_REGEX = /^[+]?[0-9\s\-\(\)]{7,20}$/;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    useFocusEffect(
        useCallback(() => { refreshUser(); }, [])
    );

    useEffect(() => {
        if (dbUser && !isEditing) {
            const data = {
                name: dbUser.firstName || user?.name || '',
                bio: dbUser.bio || '',
                phone: dbUser.phoneNumber || '',
                email: dbUser.email || user?.email || '',
                photos: [] as string[]
            };

            if (dbUser.photos && dbUser.photos.length > 0) {
                data.photos = dbUser.photos;
            } else if (dbUser.picture) {
                data.photos = [dbUser.picture];
            } else if (user?.picture) {
                data.photos = [user.picture];
            }

            setFullName(data.name);
            setBio(data.bio);
            setPhone(data.phone);
            setEmail(data.email);
            setPhotos(data.photos);
            setOriginalData(data);
        }
    }, [dbUser, isEditing]);

    const pickImage = async () => {
        if (photos.length >= 7) {
            Alert.alert("Limit Reached", "Maximum 7 photos.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    // Handlers
    const handleSave = async () => {
        const userId = user?.sub;
        if (!userId) return;
        setIsSaving(true);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: fullName, bio, phoneNumber: phone, email, photos })
            });
            if (response.ok) { await refreshUser(); setIsEditing(false); Alert.alert('Success', 'Updated!'); }
        } catch (error) { Alert.alert('Error', 'Network error.'); }
        finally { setIsSaving(false); }
    };

    const handleDeleteAccount = async () => { /* ... (Same as before) */ };
    const handleLogout = async () => { await logout(); router.replace('/login'); };

    if (!dbUser && !user) return <ActivityIndicator style={styles.centered} size="large" color={Blue[600]} />;

    const mainPhoto = photos.length > 0 ? getImageUrl(photos[0]) : null;
    const galleryImages = photos.map(p => getImageUrl(p)).filter(p => p !== null) as string[];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={24} color={Blue[600]} /></TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={isEditing ? () => {setIsEditing(false); setPhotos(originalData.photos);} : () => setIsEditing(true)}>
                    <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.profileHeaderCard}>
                    <LinearGradient colors={[Blue[500], Blue[600]]} style={styles.gradientBackground} />
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            {/* Tap: Edit -> Pick; View -> Gallery */}
                            <TouchableOpacity onPress={isEditing ? pickImage : () => setIsGalleryVisible(true)}>
                                <Avatar uri={mainPhoto} name={fullName || 'User'} size={90} />
                                {isEditing && <View style={styles.editAvatarButton}><Ionicons name="camera" size={16} color="#FFFFFF" /></View>}
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.userName}>{isEditing ? fullName : originalData.name || 'Guest'}</Text>
                        <Text style={styles.userEmail}>{isEditing ? email : originalData.email}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.propertiesViewed}</Text><Text style={styles.statLabel}>Viewed</Text></View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.interests}</Text><Text style={styles.statLabel}>Interests</Text></View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.matches}</Text><Text style={styles.statLabel}>Matches</Text></View>
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
                            {/* Add Button only in Edit Mode */}
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
                                    <Image source={{ uri: getImageUrl(photo) }} style={styles.photoThumb} />

                                    {/* Delete only in Edit Mode */}
                                    {isEditing && (
                                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto(index)}>
                                            <Ionicons name="close" size={12} color="#FFF" />
                                        </TouchableOpacity>
                                    )}
                                    {index === 0 && <View style={styles.mainLabel}><Text style={styles.mainLabelText}>MAIN</Text></View>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Personal Information</Text>
                <Card shadow="sm" style={styles.infoCard}>
                    <Input label="Full Name" value={fullName} onChangeText={setFullName} editable={isEditing} />
                    <Input label="Email" value={email} onChangeText={setEmail} editable={isEditing} />
                    <Input label="Phone" value={phone} onChangeText={setPhone} editable={isEditing} />
                    <Input label="About Me" value={bio} onChangeText={setBio} multiline numberOfLines={3} editable={isEditing} />
                    {isEditing && <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={handleSave} disabled={isSaving} style={{ marginTop: Spacing.md }} />}
                </Card>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
            </ScrollView>

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
    avatarWrapper: { position: 'relative' },
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Blue[600], width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    userName: { marginTop: Spacing.md, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Neutral[900] },
    userEmail: { fontSize: Typography.size.sm, color: Neutral[500], marginTop: 2 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, backgroundColor: '#FFFFFF', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.sm },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Blue[600] },
    statLabel: { fontSize: Typography.size.xs, color: Neutral[500] },
    statDivider: { width: 1, height: 30, backgroundColor: Neutral[200] },
    infoCard: { padding: Spacing.lg, marginHorizontal: Spacing.base, marginBottom: Spacing.lg },
    sectionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.lg },

    gallerySection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
    photoList: { flexDirection: 'row' },
    addPhotoButton: { width: 70, height: 70, borderRadius: 12, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: Blue[200], borderStyle: 'dashed' },
    photoThumbWrapper: { width: 70, height: 70, borderRadius: 12, marginRight: 10, position: 'relative' },
    photoThumb: { width: '100%', height: '100%', borderRadius: 12 },
    mainPhotoBorder: { borderWidth: 3, borderColor: Blue[500] },
    deletePhotoBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    mainLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingVertical: 2, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
    mainLabelText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },

    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginTop: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#FEE2E2' },
    logoutText: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: '#EF4444' },
});