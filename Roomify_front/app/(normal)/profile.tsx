import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Image, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

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
    const [photos, setPhotos] = useState<string[]>([]);

    // PREFERENCES
    const [isSmoker, setIsSmoker] = useState(false);
    const [hasPets, setHasPets] = useState(false);
    const [minRooms, setMinRooms] = useState(1);
    const [wantsExtraBath, setWantsExtraBath] = useState(false);
    const [tenantType, setTenantType] = useState('STUDENT');

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGalleryVisible, setIsGalleryVisible] = useState(false);

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    useFocusEffect(useCallback(() => { refreshUser(); }, []));

    useEffect(() => {
        if (dbUser && !isEditing) {
            setFullName(dbUser.firstName || user?.name || '');
            setBio(dbUser.bio || '');
            setPhone(dbUser.phoneNumber || '');
            setEmail(dbUser.email || user?.email || '');

            // Load Preferences
            setIsSmoker(dbUser.isSmoker || false);
            setHasPets(dbUser.hasPets || false);
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

    const handleSave = async () => {
        const userId = user?.sub;
        if (!userId) return;
        setIsSaving(true);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: fullName, bio, phoneNumber: phone, email, photos,
                    // SEND PREFERENCES
                    isSmoker, hasPets, minRooms, wantsExtraBathroom: wantsExtraBath, tenantType
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
                        <Text style={styles.userName}>{fullName}</Text>
                        <Text style={styles.userEmail}>{tenantType} • {email}</Text>
                    </View>
                </View>

                {/* PHOTOS */}
                {photos.length > 0 && (
                    <View style={styles.gallerySection}>
                        <Text style={styles.sectionTitle}>Photos</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                            {isEditing && <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}><Ionicons name="add" size={30} color={Blue[600]} /></TouchableOpacity>}
                            {photos.map((photo, index) => (
                                <TouchableOpacity key={index} style={styles.photoThumbWrapper} onPress={() => { /* ... logic */ }}>
                                    <Image source={{ uri: getImageUrl(photo) }} style={styles.photoThumb} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

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

                    {/* BATHROOM */}
                    <View style={styles.prefRow}>
                        <View style={styles.prefLabelContainer}><Ionicons name="water-outline" size={20} color={Neutral[600]} /><Text style={styles.prefLabel}>2+ Bathrooms</Text></View>
                        <Switch value={wantsExtraBath} onValueChange={isEditing ? setWantsExtraBath : undefined} disabled={!isEditing} trackColor={{ false: Neutral[300], true: Blue[600] }} />
                    </View>
                </Card>

                {/* PERSONAL INFO */}
                <Text style={styles.sectionTitle}>Personal Info</Text>
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
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Blue[600], width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    userName: { marginTop: Spacing.md, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Neutral[900] },
    userEmail: { fontSize: Typography.size.sm, color: Neutral[500], marginTop: 2, textTransform: 'capitalize' },

    // Preferences Styles
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

    gallerySection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
    sectionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.lg },
    photoList: { flexDirection: 'row' },
    addPhotoButton: { width: 70, height: 70, borderRadius: 12, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: Blue[200], borderStyle: 'dashed' },
    photoThumbWrapper: { width: 70, height: 70, borderRadius: 12, marginRight: 10 },
    photoThumb: { width: '100%', height: '100%', borderRadius: 12 },

    infoCard: { padding: Spacing.lg, marginHorizontal: Spacing.base, marginBottom: Spacing.lg },
    logoutButton: { alignItems: 'center', padding: Spacing.md, marginBottom: 30 },
    logoutText: { color: '#EF4444', fontWeight: 'bold' },
});