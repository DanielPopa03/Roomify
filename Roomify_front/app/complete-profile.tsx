import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Blue, Neutral, Spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const TENANT_TYPES = [
    { label: 'Student', value: 'Student' },
    { label: 'Professional', value: 'Professional' },
    { label: 'Family', value: 'Family' },
    { label: 'Couple', value: 'Couple' },
];

export default function CompleteProfileScreen() {
    const { user, getAccessToken, setIsProfileComplete, refreshUser } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // --- BASIC INFO STATE ---
    const initialEmail = user?.email?.includes('@no-email') ? '' : (user?.email || '');
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(initialEmail);
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'USER' | 'LANDLORD'>('USER');

    // --- NEW: LIFESTYLE & PREFERENCES (For Scoring) ---
    // Defaulting to safe values (e.g. Non-Smoker), but user can toggle.
    const [tenantType, setTenantType] = useState('Student');
    const [isSmoker, setIsSmoker] = useState(false);
    const [hasPets, setHasPets] = useState(false);
    const [minRooms, setMinRooms] = useState(1);
    const [wantsExtraBathroom, setWantsExtraBathroom] = useState(false);

    // --- UI STATE ---
    const [touched, setTouched] = useState({ name: false, phone: false, email: false });
    const [loading, setLoading] = useState(false);
    const [isEmailTaken, setIsEmailTaken] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // --- VALIDATION ---
    const isNameValid = name.trim().length > 1;
    const isPhoneValid = /^[+]?[0-9\s\-()]{10,15}$/.test(phone.trim());
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    // Check Email Availability
    useEffect(() => {
        if (isEmailValid && email !== initialEmail) {
            const delayDebounceFn = setTimeout(() => { checkEmailAvailability(email); }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setIsEmailTaken(false);
        }
    }, [email, isEmailValid]);

    const checkEmailAvailability = async (emailToCheck: string) => {
        setIsCheckingEmail(true);
        try {
            const token = await getAccessToken();
            const apiUrl = 'http://' + process.env.EXPO_PUBLIC_BACKEND_IP + ':8080';
            const response = await fetch(`${apiUrl}/user/check-email?email=${encodeURIComponent(emailToCheck)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setIsEmailTaken(data.isTaken);
        } catch (error) { console.error("Email check failed", error); }
        finally { setIsCheckingEmail(false); }
    };

    const handleSubmit = async () => {
        if (!isNameValid || !isPhoneValid || !isEmailValid || isEmailTaken) {
            setTouched({ name: true, phone: true, email: true });
            return;
        }

        setLoading(true);
        try {
            const token = await getAccessToken();
            const userId = encodeURIComponent(user?.sub || '');
            const apiUrl = 'http://' + process.env.EXPO_PUBLIC_BACKEND_IP + ':8080';

            // Construct Payload
            const payload: any = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phoneNumber: phone.trim(),
                role: role,
                bio: role === 'LANDLORD' ? "New Landlord" : "Looking for a home"
            };

            // Add Tenant Preferences if Role is USER
            if (role === 'USER') {
                payload.tenantType = tenantType;
                payload.isSmoker = isSmoker;
                payload.hasPets = hasPets;
                payload.minRooms = minRooms;
                payload.wantsExtraBathroom = wantsExtraBathroom;
            }

            const response = await fetch(`${apiUrl}/user/${userId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await refreshUser();
                setIsProfileComplete(true);
                Alert.alert("Welcome!", "Your profile is ready.", [{ text: "Let's Start", onPress: () => router.replace('/') }]);
            } else {
                Alert.alert("Error", "Could not save profile.");
            }
        } catch (error) {
            Alert.alert("Error", "Network request failed.");
        } finally {
            setLoading(false);
        }
    };

    const getBorderColor = (field: 'name' | 'phone' | 'email', isValid: boolean) => {
        if (field === 'email' && isEmailTaken) return '#EF4444';
        if (!touched[field]) return Neutral[300];
        return isValid ? Blue[500] : '#EF4444';
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.title}>Finish Setting Up</Text>
                <Text style={styles.subtitle}>Tell us about yourself so we can find you the best matches.</Text>

                <View style={styles.form}>
                    {/* 1. ROLE SELECTION */}
                    <Text style={styles.sectionLabel}>I want to...</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity style={[styles.roleCard, role === 'USER' && styles.activeRoleCard]} onPress={() => setRole('USER')}>
                            <Ionicons name="person" size={24} color={role === 'USER' ? Blue[600] : Neutral[400]} />
                            <Text style={[styles.roleText, role === 'USER' && styles.activeRoleText]}>Find a Room</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.roleCard, role === 'LANDLORD' && styles.activeRoleCard]} onPress={() => setRole('LANDLORD')}>
                            <Ionicons name="business" size={24} color={role === 'LANDLORD' ? Blue[600] : Neutral[400]} />
                            <Text style={[styles.roleText, role === 'LANDLORD' && styles.activeRoleText]}>List a Property</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 2. CONTACT INFO */}
                    <Text style={styles.sectionLabel}>Contact Info</Text>
                    <TextInput style={[styles.input, { borderColor: getBorderColor('name', isNameValid) }]} value={name} onChangeText={setName} onBlur={() => setTouched(p => ({...p, name: true}))} placeholder="Full Name" />

                    <TextInput style={[styles.input, { borderColor: getBorderColor('email', isEmailValid) }]} value={email} onChangeText={setEmail} onBlur={() => setTouched(p => ({...p, email: true}))} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
                    {isEmailTaken && <Text style={styles.errorText}>Email already taken.</Text>}

                    <TextInput style={[styles.input, { borderColor: getBorderColor('phone', isPhoneValid) }]} value={phone} onChangeText={setPhone} onBlur={() => setTouched(p => ({...p, phone: true}))} placeholder="Phone Number" keyboardType="phone-pad" />

                    {/* 3. TENANT PREFERENCES (Only if Role is USER) */}
                    {role === 'USER' && (
                        <View style={styles.preferencesContainer}>
                            <Text style={styles.sectionLabel}>About Me</Text>

                            {/* Tenant Type */}
                            <Text style={styles.subLabel}>I am a...</Text>
                            <View style={styles.chipsContainer}>
                                {TENANT_TYPES.map((t) => (
                                    <TouchableOpacity
                                        key={t.value}
                                        style={[styles.chip, tenantType === t.value && styles.activeChip]}
                                        onPress={() => setTenantType(t.value)}
                                    >
                                        <Text style={[styles.chipText, tenantType === t.value && styles.activeChipText]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.divider} />

                            {/* Lifestyle Switches */}
                            <View style={styles.switchRow}>
                                <View style={styles.iconLabel}>
                                    <Ionicons name="flame-outline" size={20} color={Neutral[600]} />
                                    <Text style={styles.switchText}>I am a Smoker</Text>
                                </View>
                                <Switch value={isSmoker} onValueChange={setIsSmoker} trackColor={{ false: Neutral[300], true: Blue[600] }} />
                            </View>

                            <View style={styles.switchRow}>
                                <View style={styles.iconLabel}>
                                    <Ionicons name="paw-outline" size={20} color={Neutral[600]} />
                                    <Text style={styles.switchText}>I have Pets</Text>
                                </View>
                                <Switch value={hasPets} onValueChange={setHasPets} trackColor={{ false: Neutral[300], true: Blue[600] }} />
                            </View>

                            <View style={styles.divider} />

                            {/* Requirements */}
                            <Text style={styles.sectionLabel}>What I Need</Text>

                            <View style={styles.counterRow}>
                                <Text style={styles.switchText}>Minimum Rooms</Text>
                                <View style={styles.counterControls}>
                                    <TouchableOpacity onPress={() => setMinRooms(Math.max(1, minRooms - 1))} style={styles.counterBtn}><Ionicons name="remove" size={16} color={Blue[600]} /></TouchableOpacity>
                                    <Text style={styles.counterValue}>{minRooms}</Text>
                                    <TouchableOpacity onPress={() => setMinRooms(Math.min(5, minRooms + 1))} style={styles.counterBtn}><Ionicons name="add" size={16} color={Blue[600]} /></TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.switchRow}>
                                <View style={styles.iconLabel}>
                                    <Ionicons name="water-outline" size={20} color={Neutral[600]} />
                                    <Text style={styles.switchText}>Needs 2+ Bathrooms</Text>
                                </View>
                                <Switch value={wantsExtraBathroom} onValueChange={setWantsExtraBathroom} trackColor={{ false: Neutral[300], true: Blue[600] }} />
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Profile</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#fff', padding: 24, paddingBottom: 60 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#171717', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#737373', marginBottom: 24 },
    form: { gap: 16 },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: Neutral[800], marginTop: 8 },
    subLabel: { fontSize: 12, color: Neutral[500], marginBottom: 8 },

    roleContainer: { flexDirection: 'row', gap: 12 },
    roleCard: { flex: 1, borderWidth: 1, borderColor: Neutral[200], borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: '#F9FAFB' },
    activeRoleCard: { borderColor: Blue[600], backgroundColor: Blue[50] },
    roleText: { marginTop: 8, fontWeight: '600', color: Neutral[600], fontSize: 13 },
    activeRoleText: { color: Blue[600] },

    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', borderColor: Neutral[300] },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },

    preferencesContainer: { gap: 16, marginTop: 8 },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Neutral[300], backgroundColor: '#fff' },
    activeChip: { borderColor: Blue[600], backgroundColor: Blue[50] },
    chipText: { fontSize: 13, color: Neutral[600] },
    activeChipText: { color: Blue[700], fontWeight: '600' },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    switchText: { fontSize: 15, color: Neutral[800] },

    counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Blue[50], justifyContent: 'center', alignItems: 'center' },
    counterValue: { fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },

    divider: { height: 1, backgroundColor: Neutral[100], marginVertical: 4 },

    button: { backgroundColor: Blue[600], padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});