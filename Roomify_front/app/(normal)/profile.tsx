import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Input } from '@/components/ui';
import { Blue, BorderRadius, Neutral, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout, getAccessToken } = useAuth();

    // --- STATE ---

    // 1. Current Form Values (What you see in inputs)
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // 2. Original Values (Snapshot for Cancel)
    const [originalData, setOriginalData] = useState({
        name: '',
        bio: '',
        phone: '',
        email: ''
    });

    // 3. UI & Errors
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState({ propertiesViewed: 0, interests: 0, matches: 0 });

    const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

    // --- REGEX ---
    const PHONE_VALIDATION_REGEX = /^[+]?[0-9\s\-\(\)]{7,20}$/;
    const ALLOWED_PHONE_CHARS = /[0-9\s\+\-\(\)]/g;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchProfileData = async () => {
            const userId = user?.sub;
            if (!userId) {
                setIsLoading(false);
                return;
            }

            try {
                const token = await getAccessToken();
                const response = await fetch(`http://${MY_IP}:8080/users/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();

                    // Prepare data object
                    const loadedData = {
                        name: data.firstName || data.name || user?.name || '',
                        bio: data.bio || '',
                        phone: data.phoneNumber || '',
                        email: data.email || user?.email || ''
                    };

                    // Set Form Fields
                    setFullName(loadedData.name);
                    setBio(loadedData.bio);
                    setPhone(loadedData.phone);
                    setEmail(loadedData.email);

                    // Set Snapshot (for Cancel)
                    setOriginalData(loadedData);

                    setStats({
                        propertiesViewed: data.stats?.viewed || 0,
                        interests: data.stats?.interested || 0,
                        matches: data.stats?.matches || 0
                    });
                } else {
                    // Fallback
                    const fallbackData = {
                        name: user?.name || '',
                        bio: '',
                        phone: '',
                        email: user?.email || ''
                    };
                    setFullName(fallbackData.name);
                    setEmail(fallbackData.email);
                    setOriginalData(fallbackData);
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
    }, [user, MY_IP]);

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

    // --- CANCEL BUTTON LOGIC ---
    const handleCancel = () => {
        // 1. Revert values to the 'originalData' snapshot
        setFullName(originalData.name);
        setBio(originalData.bio);
        setPhone(originalData.phone);
        setEmail(originalData.email);

        // 2. Clear any validation errors
        setPhoneError(null);
        setEmailError(null);

        // 3. Exit Edit Mode
        setIsEditing(false);
    };

    // --- SAVE BUTTON LOGIC ---
    const handleSave = async () => {
        const userId = user?.sub;
        if (!userId) return;

        if (!email || email.trim() === '') {
            setEmailError("Email is required.");
            Alert.alert("Error", "Email cannot be empty.");
            return;
        }

        if (phoneError || emailError) return;

        setIsSaving(true);

        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/users/${userId}`, {
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
                // Update the snapshot so the NEXT cancel reverts to these new values
                setOriginalData({
                    name: fullName,
                    bio: bio,
                    phone: phone,
                    email: email
                });

                setIsEditing(false);
                Alert.alert('Success', 'Profile updated successfully!');
            } else {
                const errText = await response.text();
                Alert.alert('Error', 'Update failed. ' + (errText ? errText : "Check your inputs."));
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    if (isLoading) {
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

                {/* EDIT / CANCEL BUTTON */}
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
                        {/* Display snapshot data when NOT editing to prevent UI jumping while typing */}
                        <Text style={styles.userName}>{isEditing ? fullName : originalData.name || 'Guest'}</Text>
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
                        {(emailError || (isEditing && email.trim() === '')) && (
                            <Text style={styles.errorText}>{emailError || "Email is required"}</Text>
                        )}
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
                        {phoneError && isEditing && (
                            <Text style={styles.errorText}>{phoneError}</Text>
                        )}
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
                                opacity: isSaveDisabled ? 0.7 : 1
                            }}
                        />
                    )}
                </Card>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
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
    userName: { marginTop: Spacing.md, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Neutral[900] },
    userEmail: { fontSize: Typography.size.sm, color: Neutral[500], marginTop: 2 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, backgroundColor: '#FFFFFF', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Blue[600] },
    statLabel: { fontSize: Typography.size.xs, color: Neutral[500], marginTop: 2 },
    statDivider: { width: 1, height: 30, backgroundColor: Neutral[200] },
    infoCard: { padding: Spacing.lg, marginHorizontal: Spacing.base, marginBottom: Spacing.lg },
    sectionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.lg },
    preferencesCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, overflow: 'hidden' },
    preferenceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Neutral[100] },
    preferenceLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    preferenceText: { fontSize: Typography.size.base, color: Neutral[800], fontWeight: Typography.weight.medium },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginTop: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#FEE2E2' },
    logoutText: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: '#EF4444' },
    version: { textAlign: 'center', fontSize: Typography.size.sm, color: Neutral[400], marginTop: Spacing.lg },
    errorText: { color: '#EF4444', fontSize: Typography.size.xs, marginTop: 4, marginLeft: 4 }
});